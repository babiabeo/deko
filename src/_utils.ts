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
  return [
    Number((bn & 0xFF00_0000_0000_0000n) >> 56n),
    Number((bn & 0x00FF_0000_0000_0000n) >> 48n),
    Number((bn & 0x0000_FF00_0000_0000n) >> 40n),
    Number((bn & 0x0000_00FF_0000_0000n) >> 32n),
    Number((bn & 0x0000_0000_FF00_0000n) >> 24n),
    Number((bn & 0x0000_0000_00FF_0000n) >> 16n),
    Number((bn & 0x0000_0000_0000_FF00n) >> 8n),
    Number((bn & 0x0000_0000_0000_00FFn) >> 0n),
  ];
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
