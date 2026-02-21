export const BLOCKED_HEADERS = new Set([
  "x-von-signature",
  "x-von-timestamp",
  "x-von-inbound-delivery-id",
  "authorization",
  "host",
]);

export function filterHeaders(
  headers: Record<string, string>
): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!BLOCKED_HEADERS.has(key.toLowerCase())) {
      safe[key] = value;
    }
  }
  return safe;
}
