import { Message } from "./message.ts";

/** Callback for "open" event. */
export type DekoOpenEvent = () => unknown;
/** Callback for "close" event. */
export type DekoCloseEvent = (
  code: number,
  reason?: string,
) => unknown;
/** Callback for "error" event. */
export type DekoErrorEvent = (error: Error) => unknown;
/** Callback for "message" event. */
export type DekoMessageEvent = (message: Message) => unknown;
