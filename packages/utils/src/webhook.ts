/**
 * Check if an event type matches a list of subscription patterns.
 *
 * Supported patterns:
 * - Exact match: "order.created"
 * - Prefix wildcard: "order.*" matches "order.created", "order.updated"
 * - Suffix wildcard: "*.created" matches "order.created", "user.created"
 * - All events: "*"
 *
 * @param eventType - The event type to check (e.g., "order.created")
 * @param patterns - Array of patterns to match against, or null for all events
 * @returns true if the event type matches any pattern, false otherwise
 */
export const matchesEventType = (
  eventType: string,
  patterns: string[] | null
): boolean => {
  // NULL = subscribe to everything (backwards compatible)
  if (patterns === null) {
    return true;
  }

  // Empty array = subscribe to nothing
  if (patterns.length === 0) {
    return false;
  }

  return patterns.some((pattern) => {
    // Match all events
    if (pattern === "*") {
      return true;
    }

    // Prefix wildcard: "order.*" matches "order.created"
    if (pattern.endsWith(".*")) {
      return eventType.startsWith(pattern.slice(0, -1));
    }

    // Suffix wildcard: "*.created" matches "order.created"
    if (pattern.startsWith("*.")) {
      return eventType.endsWith(pattern.slice(1));
    }

    // Exact match
    return eventType === pattern;
  });
};
