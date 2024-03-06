import { concat } from "@std/bytes";

import { Deko } from "./client.ts";
import { FrameClass, isCtrl, isNonCtrl, OpCode } from "./frame.ts";

/** Represents a WebSocket message. */
export interface Message {
  /** Indicates that this is the final fragment in a message. */
  fin: boolean;
  /** The frame type of the message. */
  opcode: OpCode;
  /** The payload data of the message. */
  payload: Uint8Array;
  /** The key used to mask all frames sent from the client to the server. */
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
        return { fin, opcode, payload, mask };
      }

      if (!fin) {
        client.fragments.push({ fin: false, opcode, payload, mask });
        continue;
      }

      if (client.fragments.length === 0) {
        return { fin: true, opcode, payload, mask };
      }

      if (isNonCtrl(opcode)) {
        await client.close({ code: 0, loose: true });
        return;
      }

      const msg = finalMessage(client.fragments, payload, mask);

      client.fragments = [];
      return msg;
    }
  } catch (e) {
    client.onError(e);
    return;
  }
}

/** Concatenate all fragments to a single message. */
function finalMessage(
  fragments: Message[],
  fin: Uint8Array,
  mask?: Uint8Array,
): Message {
  const opcode = fragments[0].opcode;
  const payload = concat([...fragments.map((m) => m.payload), fin]);
  return { fin: true, opcode, payload, mask };
}
