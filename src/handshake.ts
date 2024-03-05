import { Reader } from "@std/io";
import { encodeBase64 } from "@std/encoding/base64";

import { decode, encode } from "./_utils.ts";
import { BadHandshakeError } from "./errors.ts";

export async function readHandshake(reader: Reader) {
  let total = 0;
  const msg = new Uint8Array(1024);
  const buffer = new Uint8Array(1);

  for (; total < 1024; total++) {
    if (total > 5) {
      const line = decode(msg.slice(total - 4, total));
      if (line === "\r\n\r\n") {
        break;
      }
    }

    const bytesRead = await reader.read(buffer);
    if (!bytesRead) {
      throw new BadHandshakeError("Unexpected no response from handshake");
    }

    msg[total] = buffer[0];
  }

  return decode(msg.slice(0, total));
}

export async function verifyHandshake(response: string, key: string) {
  const lines = response.split(/\r\n|\r|\n/);
  if (!lines.shift()?.includes("101 Switching Protocols")) {
    throw new BadHandshakeError("Server does not accept handshake");
  }

  let protocol = "";
  let pass = true;

  for (const line of lines) {
    if (line.trim().length === 0) continue;

    const header = line.split(":").map((s) => s.trim());
    switch (header[0].toLowerCase()) {
      case "upgrade": {
        pass &&= header[1].toLowerCase() === "websocket";
        break;
      }
      case "connection": {
        pass &&= header[1].toLowerCase() === "upgrade";
        break;
      }
      case "sec-websocket-accept": {
        const expect = await getAcceptKey(key);
        const actual = header[1];

        pass &&= actual === expect;
        break;
      }
      case "sec-websocket-protocol": {
        protocol = header[1];
        break;
      }
    }
  }

  if (!pass) {
    throw new BadHandshakeError("Unacceptable handshake");
  }

  return protocol;
}

/** Gets the base64-encoded accept key from `Sec-WebSocket-Key` header. */
export async function getAcceptKey(seckey: string): Promise<string> {
  const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
  const key = await crypto.subtle.digest(
    "SHA-1",
    encode(seckey + GUID),
  );
  return encodeBase64(key);
}

/** Creates a secret key for `Sec-WebSocket-Key` header. */
export function createSecKey(): string {
  const key = new Uint8Array(16);
  crypto.getRandomValues(key);
  return encodeBase64(key);
}
