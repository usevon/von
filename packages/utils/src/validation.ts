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
  /^fd00:ec2::254$/i,
]

const BLOCKED_HOSTNAMES = [
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "metadata.azure.com",
]

const isPrivateIP = (hostname: string): boolean => {
  if (PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(hostname))) return true
  const ipv6 = hostname.startsWith("[") ? hostname.slice(1, -1) : hostname
  return PRIVATE_IPV6_PATTERNS.some((pattern) => pattern.test(ipv6))
}

const isBlockedHostname = (hostname: string): boolean => {
  const lower = hostname.toLowerCase()
  return BLOCKED_HOSTNAMES.some((h) => lower === h || lower.endsWith("." + h))
}

export const isValidWebhookUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url)
    if (!["http:", "https:"].includes(parsed.protocol)) return false
    if (isBlockedHostname(parsed.hostname)) return false
    if (isPrivateIP(parsed.hostname)) return false
    return true
  } catch {
    return false
  }
}
