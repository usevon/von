import {
  createHash,
  createHmac,
  timingSafeEqual as nodeTimingSafeEqual,
  randomBytes,
} from "node:crypto";

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

export function buildSignatureHeader(
  timestamp: number,
  signedPayload: string,
  secret: string,
  previousSecret?: string | null
): string {
  const v1 = hmacSign(signedPayload, secret);
  if (previousSecret) {
    const v2 = hmacSign(signedPayload, previousSecret);
    return `t=${timestamp},v1=${v1},v2=${v2}`;
  }
  return `t=${timestamp},v1=${v1}`;
}
