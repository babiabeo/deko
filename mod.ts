/**
 * _**Deko**_ is a simple WebSocket client for Deno. It also supports custom headers
 * (but this will not work in browsers).
 *
 * If you want to connect WebSocket on browsers, consider to use {@linkcode WebSocket} instead.
 *
 * Reference: {@link https://datatracker.ietf.org/doc/html/rfc6455 | RFC 6455}.
 */

export * from "./src/client.ts";
export * from "./src/errors.ts";
export * from "./src/events.ts";
export * from "./src/mask.ts";
export { createSecKey, getAcceptKey } from "./src/handshake.ts";
export { CloseCode, type CloseOptions } from "./src/close.ts";
export { type Frame, isCtrl, isNonCtrl, OpCode } from "./src/frame.ts";
export { type Message } from "./src/message.ts";
