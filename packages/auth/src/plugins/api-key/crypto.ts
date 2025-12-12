import {
  hashSha256,
  hmacSign as baseHmacSign,
  timingSafeEqual,
} from "@usevon/utils"

const SIG_LENGTH = 16

const PREFIXES: Record<string, string> = {
  von_dev_: "dev",
  von_stg_: "staging",
  von_prod_: "prod",
}

export { hashSha256 as hashKey }

export function hmacSign(data: string, secret: string): string {
  return baseHmacSign(data, secret).slice(0, SIG_LENGTH)
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
