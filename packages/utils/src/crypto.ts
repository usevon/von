export function hashSha256(data: string): string {
  const hasher = new Bun.CryptoHasher("sha256")
  hasher.update(data)
  return hasher.digest("hex")
}

export function hmacSign(data: string, secret: string): string {
  const hmac = new Bun.CryptoHasher("sha256", secret)
  hmac.update(data)
  return hmac.digest("hex")
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

export function verifyHmac(data: string, signature: string, secret: string): boolean {
  const expected = hmacSign(data, secret)
  return timingSafeEqual(expected, signature)
}

export function randomHex(bytes: number): string {
  const array = new Uint8Array(bytes)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("")
}
