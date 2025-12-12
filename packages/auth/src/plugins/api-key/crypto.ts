const SIG_LENGTH = 16

const PREFIXES: Record<string, string> = {
  von_dev_: "dev",
  von_stg_: "staging",
  von_prod_: "prod",
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

export function hashKey(key: string): string {
  const hasher = new Bun.CryptoHasher("sha256")
  hasher.update(key)
  return hasher.digest("hex")
}

export function hmacSign(data: string, secret: string): string {
  const hmac = new Bun.CryptoHasher("sha256", secret)
  hmac.update(data)
  return hmac.digest("hex").slice(0, SIG_LENGTH)
}

export function verifySignature(key: string, secret: string): boolean {
  const dotIndex = key.lastIndexOf(".")
  if (dotIndex === -1) return true

  const prefixMatch = Object.keys(PREFIXES).find((p) => key.startsWith(p))
  if (!prefixMatch) return false

  const body = key.slice(0, dotIndex)
  const signature = key.slice(dotIndex + 1)
  const random = body.slice(prefixMatch.length)

  const expected = hmacSign(random, secret)
  return timingSafeEqual(expected, signature)
}

export function hasValidPrefix(key: string): boolean {
  return Object.keys(PREFIXES).some((p) => key.startsWith(p))
}
