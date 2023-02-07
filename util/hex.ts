/**
 * @file Methods for encoding and decoding hexidecimal strings
 * @copyright 2023 Matthew A. Miller
 */

/**
 * Encodes the given data as a hexidecimal string.
 * 
 * @param data binary data to encode
 * @returns hex-encoded string
 */
export function encode(data: Uint8Array | Uint8ClampedArray | ArrayBuffer): string{
  let src: Uint8Array;
  if (data instanceof ArrayBuffer) {
    src = new Uint8Array(data, 0, data.byteLength);
  } else if (data instanceof Uint8ClampedArray) {
    src = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  } else {
    src = data;
  }

  const out: string[] = [];
  for (const b of src) {
    out.push((0x100 | b).toString(16).substring(1));
  }

  return out.join("");
}

/**
 * Decodes a hexidecimal string into a byte array.
 * 
 * @param data hex-encoded data to encode
 * @returns The binary data
 * @throws Error if {data} is not a valid hexidecimal string
 */
export function decode(data: string): Uint8Array {
  if (data.length % 2 !== 0) {
    throw new Error("invalid input size");
  }

  const out = new Uint8Array(data.length / 2);
  for (let idx = 0; idx < data.length; idx +=2) {
    const hex = data.substring(idx, idx + 2);
    const val = parseInt(hex, 16);
    if (isNaN(val)) {
      throw Error("invalid input string");
    }
    out[idx / 2] = parseInt(hex, 16);
  }

  return out;
}
