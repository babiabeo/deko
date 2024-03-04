/** Creates a masking key. */
export function createMaskingKey(): Uint8Array {
  const key = new Uint8Array(4);
  crypto.getRandomValues(key);
  return key;
}

/** Unmasks the frame payload with provided masking key. */
export function unmask(data: Uint8Array, key: Uint8Array) {
  for (let i = 0; i < data.byteLength; ++i) {
    data[i] ^= key[i % 4];
  }
}
