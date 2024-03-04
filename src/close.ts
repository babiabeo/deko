/** WebSocket close codes. */
export enum CloseCode {
  /**
   * Indicates a normal closure, meaning that the purpose for
   * which the connection was established has been fulfilled (1000).
   */
  NormalClosure = 1000,
  /**
   * Indicates that an endpoint is "going away", such as a server
   * going down or a browser having navigated away from a page. (1001).
   */
  GoingAway,
  /**
   * Indicates that an endpoint is terminating the connection due
   * to a protocol error. (1002).
   */
  ProtocolError,
  /**
   * Indicates that an endpoint is terminating the connection
   * because it has received a type of data it cannot accept (1003).
   */
  CannotAccept,
  /** (Reserved) Indicates that no status code was actually present. (1005). */
  NoStatusCode = 1005,
  /**
   * (Reserved) Indicates that the connection was closed abnormally,
   * e.g., without sending or receiving a Close control frame. (1006).
   */
  AbnormalClose,
  /**
   * Indicates that an endpoint is terminating the connection
   * because it has received data within a message that was not
   * consistent with the type of the message (1007).
   */
  InconsistentType,
  /**
   * Indicates that an endpoint is terminating the connection
   * because it has received a message that violates its policy (1008).
   */
  PolicyViolation,
  /**
   * Indicates that an endpoint is terminating the connection
   * because it has received a message that is too big for it to
   * process. (1009).
   */
  MessageTooBig,
  /**
   * Indicates that an endpoint (client) is terminating the
   * connection because it has expected the server to negotiate one or
   * more extension, but the server didn't return them in the response
   * message of the WebSocket handshake (1010).
   */
  DenyExtension,
  /** Indicates that a server is terminating the connection because
   * it encountered an unexpected condition that prevented it from
   * fulfilling the request (1011).
   */
  InternalError,
  /**
   * (Reserved) Indicates that the connection was closed due to a
   * failure to perform a TLS handshake (1015).
   */
  BadTLSHandshake = 1015,
}

export interface CloseOptions {
  /** The close code. */
  code?: number;
  /** The close reason. */
  reason?: string;
  /** Whether to close without checking the close code. */
  loose?: boolean;
}

/** Handle close code. */
export function handleCloseCode(code: number) {
  if (code < 1000) {
    return CloseCode.ProtocolError;
  }

  if (code < 1016) {
    if ([1004, 1005, 1006, 1015].includes(code)) {
      return CloseCode.ProtocolError;
    }

    return code;
  }

  if (code < 3000) {
    return CloseCode.ProtocolError;
  }

  return code;
}
