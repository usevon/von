const PRIVATE_IPV4_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
]

const PRIVATE_IPV6_PATTERNS = [
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
]

const isPrivateIP = (hostname: string): boolean => {
  if (PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(hostname))) return true
  // URL.hostname returns IPv6 with brackets, strip them for matching
  const ipv6 = hostname.startsWith("[") ? hostname.slice(1, -1) : hostname
  return PRIVATE_IPV6_PATTERNS.some((pattern) => pattern.test(ipv6))
}

export const isValidWebhookUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url)
    if (!["http:", "https:"].includes(parsed.protocol)) return false
    if (parsed.hostname === "localhost") return false
    if (isPrivateIP(parsed.hostname)) return false
    return true
  } catch {
    return false
  }
}
