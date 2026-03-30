export const VALID_SCOPES = [
  "*",
  "read:*",
  "write:*",
  "read:webhooks",
  "write:webhooks",
  "read:endpoints",
  "write:endpoints",
  "read:inbound",
  "write:inbound",
  "read:versions",
  "write:versions",
  "read:analytics",
  "read:tunnels",
  "write:tunnels",
] as const;

export type Scope = (typeof VALID_SCOPES)[number];

export function parseScopes(raw: string | string[] | null): Scope[] {
  if (!raw) {
    return ["*"];
  }
  if (Array.isArray(raw)) {
    return raw.filter((s): s is Scope =>
      (VALID_SCOPES as readonly string[]).includes(s)
    );
  }
  try {
    const parsed: string[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((s): s is Scope =>
      (VALID_SCOPES as readonly string[]).includes(s)
    );
  } catch {
    return [];
  }
}

export function hasScope(scopes: string[], required: string): boolean {
  if (scopes.includes("*")) {
    return true;
  }
  if (scopes.includes(required)) {
    return true;
  }
  const [action] = required.split(":");
  return scopes.includes(`${action}:*`);
}
