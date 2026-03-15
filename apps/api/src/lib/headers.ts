/**
 * Converts an Elysia headers record (which may contain undefined values)
 * to a plain `Record<string, string>` by filtering out non-string entries.
 */
export const toStringHeaders = (
  headers: Record<string, string | undefined>
): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }
  return result;
};
