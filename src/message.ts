import { concat } from "@std/bytes";
import { Deko } from "./client.ts";
import { FrameClass, isCtrl, isNonCtrl, OpCode } from "./frame.ts";
// import { CloseCode } from "./close.ts";

/** Represents a WebSocket fragment (message). */
export interface Message {
  /** Indicates that this is the final fragment in a message */
  fin: boolean;
  /** The frame type of the message. */
  opcode: OpCode;
  /** The payload data of the message. */
  payload: Uint8Array;
  /** The key used to mask all frames sent from the client to the websocket. */
  mask?: Uint8Array;
}

/** Reads incoming message from WebSocket. */
export async function readMessage(client: Deko) {
  try {
    while (true) {
      const frame = await FrameClass.from(client);
      if (!frame) break;

      const { fin, opcode, payload, mask } = frame.data;

      if (isCtrl(opcode)) {
        const msg: Message = { fin, opcode, payload, mask };
        return msg;
      }

      if (!frame.data.fin) {
        client.fragments.push({ fin, opcode, payload, mask });
        continue;
      }

      if (client.fragments.length === 0) {
        const msg: Message = { fin, opcode, payload, mask };
        return msg;
      }

      if (isNonCtrl(opcode)) {
        await client.close({ code: 0, loose: true });
        return;
      }

      const data = concat([
        ...client.fragments.map((mes) => mes.payload),
        payload,
      ]);

      const msg: Message = {
        fin,
        mask,
        opcode: client.fragments[0].opcode,
        payload: data,
      };

      client.fragments = [];
      return msg;
    }
  } catch (e) {
    client.onError(e);
    return;
  }
}
