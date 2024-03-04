/** Thrown if there is an error occurred when handshaking. */
export class BadHandshakeError extends Error {
  override name = "BadHandshakeError";
  constructor(error: string) {
    super(error);
  }
}

/** Thrown if cannot read all frame data. */
export class ReadFrameError extends Error {
  override name = "ReadFrameError";
  constructor() {
    super("Unable to read all frame data.");
  }
}

/** Thrown if found an invalid frame field. */
export class InvalidFrameError extends Error {
  override name = "InvalidFrameError";
  constructor(mes: string) {
    super(mes);
  }
}

/** Thrown if payload is an invalid UTF-8. */
export class InvalidUTF8Error extends Error {
  override name = "InvalidUTF8Error";
  constructor() {
    super("Invalid UTF-8 payload");
  }
}

/** Thrown if there is no frame to read. */
export class ReadFailedError extends Error {
  override name = "ReadFailedError";
  constructor() {
    super("Failed to read message");
  }
}

/** Thrown if close payload length is 1. */
export class InvalidCloseError extends Error {
  override name = "InvalidCloseError";
  constructor() {
    super("Invalid close payload");
  }
}
