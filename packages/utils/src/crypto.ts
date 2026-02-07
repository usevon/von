import { createHash, createHmac, randomBytes, timingSafeEqual as nodeTimingSafeEqual } from "node:crypto";

export const hashSha256 = (data: string): string =>
  createHash("sha256").update(data).digest("hex");

export const hmacSign = (data: string, secret: string): string =>
  createHmac("sha256", secret).update(data).digest("hex");

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return nodeTimingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export const randomHex = (bytes: number): string =>
  randomBytes(bytes).toString("hex");
