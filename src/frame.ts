import { Reader } from "@std/io";

import { unmask } from "./mask.ts";
import { Deko } from "./client.ts";
import { CloseCode } from "./close.ts";
import { InvalidFrameError, ReadFrameError } from "./errors.ts";

/** WebSocket Opcodes define the interpretation of the payload data. */
export enum OpCode {
  /** Denotes a continuation frame. */
  Continuation = 0x0,
  /** Denotes a text frame. */
  TextFrame = 0x1,
  /** Denotes a binary frame. */
  BinaryFrame = 0x2,
  /** Denotes a connection close. */
  Close = 0x8,
  /** Denotes a ping. */
  Ping = 0x9,
  /** Denotes a pong. */
  Pong = 0xA,
}

/** Returns `true` if the given opcode is a control opcode. */
export function isCtrl(opcode: OpCode): boolean {
  const ctrl = [OpCode.Close, OpCode.Ping, OpCode.Pong];
  return ctrl.includes(opcode);
}

/** Returns `true` if the given opcode is a non-control opcode. */
export function isNonCtrl(opcode: OpCode): boolean {
  const nonCtrl = [OpCode.TextFrame, OpCode.BinaryFrame];
  return nonCtrl.includes(opcode);
}

/** Represents a WebSocket frame. */
export interface Frame {
  /** Indicates that this is the final fragment in a message */
  fin: boolean;
  /** Reversed for future use. (`rsv1`, `rsv2` and `rsv3`) */
  rsv: boolean;
  /** The interpretation of the payload data. */
  opcode: OpCode;
  /** The length of the payload data. */
  len: number;
  /** The frame payload. */
  payload: Uint8Array;
  /** The key used to mask all frames sent from the client to the websocket. */
  mask?: Uint8Array;
}

/** Class for working with WebSocket frame. */
export class FrameClass {
  #client: Deko;
  #data: Frame;

  constructor(client: Deko, data: Frame) {
    this.#client = client;
    this.#data = { ...data };
  }

  /** Frame data. */
  get data() {
    return this.#data;
  }

  /** Returns `true` if frame data is valid. */
  async validate() {
    const { fin, rsv, opcode, len } = this.#data;

    if (rsv) {
      this.#client.onError(
        new InvalidFrameError(
          "Reserved fields must be 0",
        ),
      );
      await this.#client.close({ code: 0, loose: true });
      return false;
    }

    if (
      (opcode < OpCode.Continuation) || (opcode > OpCode.Pong) ||
      (OpCode.BinaryFrame < opcode && opcode < OpCode.Close)
    ) {
      this.#client.onError(
        new InvalidFrameError(
          "Found reserved opcode",
        ),
      );
      await this.#client.close({ code: 0, loose: true });
      return false;
    }

    if (isCtrl(opcode)) {
      if (!fin) {
        this.#client.onError(
          new InvalidFrameError(
            "Control frame must not be fragmented",
          ),
        );
        await this.#client.close({ code: 0, loose: true });
        return false;
      }

      if (len > 125) {
        this.#client.onError(
          new InvalidFrameError(
            "Control frame payloads must not exceed 125 bytes",
          ),
        );
        await this.#client.close({ code: 0, loose: true });
        return false;
      }
    }

    if (
      fin && opcode === OpCode.Continuation &&
      !this.#client.fragments.length
    ) {
      this.#client.onError(
        new InvalidFrameError("There is no message to continue"),
      );
      await this.#client.close({ code: 0, loose: true });
      return false;
    }

    return true;
  }

  /** Parse a frame from the websocket. */
  static async from(client: Deko) {
    const header = await readExact(client.conn, 2);

    const fin = (header[0] & 0x80) === 0x80;
    const rsv = (header[0] & 0x70) === 0x70;
    const opcode = header[0] & 0x7F;

    const masked = (header[1] & 0x80) === 0x80;
    let len = header[1] & 0x7F;

    if (len === 126) {
      const sub = await readExact(client.conn, 2);
      const view = new DataView(
        sub.buffer,
        sub.byteOffset,
        sub.byteLength,
      );
      len = view.getUint16(0);
    } else if (len === 127) {
      const sub = await readExact(client.conn, 8);
      const view = new DataView(
        sub.buffer,
        sub.byteOffset,
        sub.byteLength,
      );
      const u64 = view.getBigUint64(0);
      if (u64 > BigInt(Number.MAX_SAFE_INTEGER)) {
        await client.close({
          code: CloseCode.MessageTooBig,
          reason: "Frame too large",
        });
        return;
      }
      len = Number(u64);
    }

    let key: Uint8Array | undefined;
    if (masked) {
      key = await readExact(client.conn, 4);
    }

    const payload = await readExact(client.conn, len);
    if (masked) {
      unmask(payload, key!);
    }

    // deno-fmt-ignore
    const frame = new FrameClass(client, {
      fin, rsv, opcode, len, payload, mask: key
    });

    if (!(await frame.validate())) {
      return;
    }

    return frame;
  }
}

/** Read exactly `len` data. */
async function readExact(reader: Reader, len: number): Promise<Uint8Array> {
  const buf = new Uint8Array(len);
  let nread = 0;

  while (nread < len) {
    const bread = await reader.read(buf.subarray(nread));
    if (bread === null) {
      throw new ReadFrameError();
    }
    nread += bread;
  }

  return buf;
}
