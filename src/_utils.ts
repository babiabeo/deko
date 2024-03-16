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
  return [(n >> 8) & 0xFF, n & 0xFF];
}

/** host-to-network long long (htonll). */
export function hton64(n: number): number[] {
  const bn = BigInt(n);
  return [
    Number((bn >> 56n) & 0xFFn),
    Number((bn >> 48n) & 0xFFn),
    Number((bn >> 40n) & 0xFFn),
    Number((bn >> 32n) & 0xFFn),
    Number((bn >> 24n) & 0xFFn),
    Number((bn >> 16n) & 0xFFn),
    Number((bn >> 8n) & 0xFFn),
    Number(bn & 0xFFn),
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
    (BigInt(buffer[7]))
  );
}

/** Get big-endian 16-bit short from buffer. */
export function getUint16(buffer: Uint8Array) {
  return (buffer[0] << 8) | buffer[1];
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
