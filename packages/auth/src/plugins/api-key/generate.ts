import { randomBytes } from "node:crypto";

const BASE62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const BASE62_LENGTH = BASE62.length;
const REJECTION_THRESHOLD = 256 - (256 % BASE62_LENGTH);

export function generateRandomString(length: number): string {
  let result = "";
  while (result.length < length) {
    const buf = randomBytes(length * 2);
    for (let i = 0; i < buf.length && result.length < length; i++) {
      const byte = buf[i] as number;
      if (byte < REJECTION_THRESHOLD) {
        result += BASE62[byte % BASE62_LENGTH];
      }
    }
  }
  return result;
}
