export function hashSha256(data: string): string {
  // Use Bun's fast hasher if available, otherwise fall back to Node.js crypto
  if (typeof Bun !== "undefined") {
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(data);
    return hasher.digest("hex");
  }
  // Node.js fallback
  const nodeCrypto = require("node:crypto");
  return nodeCrypto.createHash("sha256").update(data).digest("hex");
}

export function hmacSign(data: string, secret: string): string {
  // Use Bun's fast hasher if available, otherwise fall back to Node.js crypto
  if (typeof Bun !== "undefined") {
    const hmac = new Bun.CryptoHasher("sha256", secret);
    hmac.update(data);
    return hmac.digest("hex");
  }
  // Node.js fallback
  const nodeCrypto = require("node:crypto");
  return nodeCrypto.createHmac("sha256", secret).update(data).digest("hex");
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  // Bun has crypto.timingSafeEqual globally, Node.js needs require('crypto')
  if (typeof Bun !== "undefined") {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
  const nodeCrypto = require("node:crypto");
  return nodeCrypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function randomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
