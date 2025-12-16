const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
]

const isPrivateIP = (hostname: string): boolean => {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname))
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
