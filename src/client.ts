import { writeAll } from "@std/io";
import { concat } from "@std/bytes";
import { decode, encode, hton16, hton64, isUTF8 } from "./_utils.ts";
import { createSecKey, readHandshake, verifyHandshake } from "./handshake.ts";
import { Message, readMessage } from "./message.ts";
import {
  DekoCloseEvent,
  DekoErrorEvent,
  DekoMessageEvent,
  DekoOpenEvent,
} from "./events.ts";
import { OpCode } from "./frame.ts";
import { CloseCode, CloseOptions, handleCloseCode } from "./close.ts";
import { createMaskingKey, unmask } from "./mask.ts";
import {
  InvalidCloseError,
  InvalidUTF8Error,
  ReadFailedError,
} from "./errors.ts";

/** Represents the state of the connection. */
export enum DekoState {
  /** Client is connecting. */
  CONNECTING,
  /** Connection is opened. */
  OPEN,
  /** Connection is closing. */
  CLOSING,
  /** Connection is closed. */
  CLOSED,
}

export interface DekoConfig {
  /** The uri used to establish the WebSocket connection. */
  uri: string | URL;
  /** Extra headers that will be used when connecting. */
  headers?: HeadersInit;
  /** An array of protocol strings used to indicate sub-protocols. */
  protocols?: string[];
}

/** A simple WebSocket client. */
export class Deko {
  #conn: Deno.Conn = undefined!;
  #uri: URL;
  #headers: Headers;
  #protocol: string;
  #protocols: string[];
  #lastPong: number;
  #state: DekoState;

  /** The current fragments. */
  fragments: Message[];
  /** Called when the WebSocket connection is opened. */
  onOpen: DekoOpenEvent;
  /** Called when receiving a message. */
  onMessage: DekoMessageEvent;
  /** Called when an error occurred. */
  onError: DekoErrorEvent;
  /** Called when the WebSocket connection is closed. */
  onClose: DekoCloseEvent;

  constructor(config: DekoConfig) {
    this.#state = DekoState.CLOSED;
    this.#lastPong = -1;
    this.#uri = new URL(config.uri);
    this.#headers = new Headers(config.headers);

    this.fragments = [];
    this.onClose = () => {};
    this.onError = () => {};
    this.onMessage = () => {};
    this.onOpen = () => {};

    config.protocols = config.protocols ?? [];

    // https://github.com/websockets/ws/blob/master/lib/websocket.js#L37
    const protocolRegexp = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    const protocols = new Set(
      config.protocols.map((p) => p.toLowerCase()),
    );

    if (protocols.size !== config.protocols.length) {
      throw new SyntaxError("Can't have duplicated protocol");
    }
    if (config.protocols.some((p) => !protocolRegexp.test(p))) {
      throw new SyntaxError("Invalid protocol");
    }

    this.#protocols = config.protocols;
    this.#protocol = "";
  }

  /** The uri used to establish the WebSocket connection. */
  get uri(): URL {
    return this.#uri;
  }

  /** The state of the connection. */
  get state(): DekoState {
    return this.#state;
  }

  /** Headers used when connecting. */
  get headers(): Headers {
    return this.#headers;
  }

  /** The sub-protocol selected by the server. */
  get protocol(): string {
    return this.#protocol;
  }

  /** The connection of this client. */
  get conn(): Deno.Conn {
    return this.#conn;
  }

  /** The last time the client received a pong. */
  get lastPong(): number {
    return this.#lastPong;
  }

  async connect() {
    if (this.state !== DekoState.CLOSED) {
      throw new Deno.errors.ConnectionRefused(
        `The client state is: ${DekoState[this.state]}`,
      );
    }

    this.#state = DekoState.CONNECTING;

    switch (this.uri.protocol) {
      case "ws:":
      case "http:":
        this.#conn = await Deno.connect({
          hostname: this.uri.hostname,
          port: +(this.uri.port || 80),
        });
        break;
      case "wss:":
      case "https:":
        this.#conn = await Deno.connectTls({
          hostname: this.uri.hostname,
          port: +(this.uri.port || 443),
        });
        break;
      default:
        throw new Deno.errors.ConnectionRefused(
          `Unsupported protocol: ${this.uri.protocol}`,
        );
    }

    try {
      await this.#handshake();
    } catch (e) {
      this.onError(e);
      return this.#conn.close();
    }

    this.#state = DekoState.OPEN;
    this.onOpen();
    this.#listen();
  }

  /** Sends a message frame to the websocket. */
  sendMessage(mes: string | Uint8Array): Promise<void> {
    if (typeof mes === "string") {
      return this.send({
        opcode: OpCode.TextFrame,
        payload: encode(mes),
        fin: true,
      });
    }

    return this.send({ opcode: OpCode.BinaryFrame, payload: mes, fin: true });
  }

  /** Sends a ping message to the websocket. */
  ping(data: Uint8Array): Promise<void> {
    return this.send({ opcode: OpCode.Ping, payload: data, fin: true });
  }

  /** Sends a pong message to the websocket. */
  pong(data: Uint8Array): Promise<void> {
    return this.send({ opcode: OpCode.Pong, payload: data, fin: true });
  }

  /** Sends a frame to the websocket. */
  async send(message: Message): Promise<void> {
    if (this.state !== DekoState.OPEN && this.state !== DekoState.CLOSING) {
      throw new Deno.errors.NotConnected("Client is not connected");
    }

    const { fin, opcode, payload, mask } = message;

    const len = payload.byteLength;
    const header = [Number(fin) << 7 | opcode];
    const maskey = mask ?? createMaskingKey();

    if (len < 126) {
      header[1] = len;
    } else if (len <= 0xFFFF) {
      header[1] = 126;
      header.push(
        ...hton16(len),
      );
    } else if (len <= 0x7FFFFFFF) {
      header[1] = 127;
      header.push(
        ...hton64(len),
      );
    } else {
      return this.close({
        code: CloseCode.MessageTooBig,
        reason: "Frame too large",
      });
    }

    let head = new Uint8Array(header);
    head[1] |= 0x80;
    head = concat([head, maskey]);
    unmask(payload, maskey);
    head = concat([head, payload]);

    await writeAll(this.#conn, head);
  }

  /** Closes the WebSocket connection. */
  async close(options: CloseOptions = {}): Promise<void> {
    if (this.state === DekoState.CLOSING || this.state === DekoState.CLOSED) {
      return;
    }

    const loose = !!(options.loose);
    const closeCode = options.code !== undefined
      ? loose ? options.code : handleCloseCode(options.code)
      : CloseCode.NormalClosure;
    const closeReason = options.reason ?? "";

    this.#state = DekoState.CLOSING;
    try {
      let closeFrame: Uint8Array;
      if (closeCode > 0) {
        const reason = encode(closeReason);
        closeFrame = new Uint8Array(reason.byteLength + 2);
        closeFrame.set([closeCode >> 8, closeCode & 0xFF]);
        closeFrame.set(reason, 2);
      } else {
        closeFrame = new Uint8Array();
      }

      await this.send({ opcode: OpCode.Close, payload: closeFrame, fin: true });
    } catch (e) {
      this.onError(e);
    } finally {
      this.fragments = [];
      this.conn.close();
      this.onClose(closeCode, closeReason);
      this.#state = DekoState.CLOSED;
    }
  }

  async #handshake() {
    const { host, pathname, search } = this.#uri;
    const seckey = createSecKey();

    if (!this.#headers.has("Host")) {
      this.#headers.append("Host", host);
    }

    this.#headers.append("Upgrade", "websocket");
    this.#headers.append("Connection", "Upgrade");
    this.#headers.append("Sec-WebSocket-Key", seckey);
    this.#headers.append("Sec-WebSocket-Version", "13");

    if (this.#protocols.length) {
      this.headers.append(
        "Sec-WebSocket-Protocol",
        this.#protocols.join(", "),
      );
    }

    let request = `GET ${pathname}${search} HTTP/1.1\r\n`;
    for (const [key, value] of this.headers) {
      request += `${key}: ${value}\r\n`;
    }
    request += "\r\n";

    await writeAll(this.#conn, encode(request));

    const response = await readHandshake(this.#conn);
    this.#protocol = await verifyHandshake(response, seckey);
  }

  /** Listens and reads incoming messages. */
  async #listen() {
    while (this.state === DekoState.OPEN) {
      const msg = await readMessage(this);
      if (!msg) {
        this.onError(new ReadFailedError());
        break;
      }

      switch (msg.opcode) {
        case OpCode.TextFrame: {
          if (msg.fin && !isUTF8(msg.payload)) {
            this.onError(new InvalidUTF8Error());
            await this.close({ code: 0, loose: true });
          } else {
            this.onMessage(msg);
          }
          break;
        }
        case OpCode.BinaryFrame:
          this.onMessage(msg);
          break;

        case OpCode.Pong:
          this.#lastPong = Date.now();
          break;

        case OpCode.Ping:
          await this.pong(msg.payload);
          break;

        case OpCode.Close: {
          if (msg.payload.length === 0) {
            await this.close({ code: 0, loose: true });
            break;
          }

          if (msg.payload.length === 1) {
            this.onError(new InvalidCloseError());
            await this.close({ code: CloseCode.ProtocolError });
            break;
          }

          const code = (msg.payload[0] << 8) | msg.payload[1];
          const mes = msg.payload.subarray(2);
          if (!isUTF8(mes)) {
            this.onError(new InvalidUTF8Error());
            await this.close({ code: 0, loose: true });
            break;
          }

          const reason = decode(msg.payload.subarray(2));
          await this.close({ code, reason });
          break;
        }

        case OpCode.Continuation: {
          this.onError(new Error("Unexpected continuation"));
          await this.close({ code: 0, loose: true });
          break;
        }
      }
    }

    if (this.state !== DekoState.CONNECTING) {
      this.close({ reason: "Closed by client" });
    }
  }
}
