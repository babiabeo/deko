/** Encodes a string to bytes. */
export function encode(input: string) {
  return new TextEncoder().encode(input);
}

/** Decodes bytes to a string. */
export function decode(input: BufferSource) {
  return new TextDecoder().decode(input);
}

/** host-to-network short (htons). */
export function hton16(n: number) {
  return [
    (n & 0xFF00) >> 8,
    (n & 0x00FF) >> 0,
  ];
}

/** host-to-network long long (htonll). */
export function hton64(n: number): number[] {
  const bn = BigInt(n);
  // deno-fmt-ignore
  return [
    Number((bn & 0xFF00_0000_0000_0000n) >> 56n),
    Number((bn & 0x00FF_0000_0000_0000n) >> 48n),
    Number((bn & 0x0000_FF00_0000_0000n) >> 40n),
    Number((bn & 0x0000_00FF_0000_0000n) >> 32n),
    Number((bn & 0x0000_0000_FF00_0000n) >> 24n),
    Number((bn & 0x0000_0000_00FF_0000n) >> 16n),
    Number((bn & 0x0000_0000_0000_FF00n) >>  8n),
    Number((bn & 0x0000_0000_0000_00FFn) >>  0n),
  ];
}

/** Get big-endian 64-bit long from buffer. */
export function getUint64(buffer: Uint8Array) {
  // deno-fmt-ignore
  return (
    (BigInt(buffer[0]) << 56n) |
    (BigInt(buffer[1]) << 48n) |
    (BigInt(buffer[2]) << 40n) |
    (BigInt(buffer[3]) << 32n) |
    (BigInt(buffer[4]) << 24n) |
    (BigInt(buffer[5]) << 16n) |
    (BigInt(buffer[6]) <<  8n) |
    (BigInt(buffer[7]) <<  0n)
  );
}

/** Get big-endian 16-bit short from buffer. */
export function getUint16(buffer: Uint8Array) {
  return (buffer[0] << 8) | (buffer[1] << 0);
}

/** Check if payload is a valid UTF-8. */
export function isUTF8(payload: Uint8Array) {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(payload);
    return true;
  } catch (_) {
    return false;
  }
}
