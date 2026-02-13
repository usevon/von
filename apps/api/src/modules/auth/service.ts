import { parseScopes } from "@usevon/auth";
import type {
  AuthApi,
  AuthHeaders,
  RedisTracking,
  ResolvedAuth,
  SessionContext,
} from "@/modules/auth/model";

export async function resolveAuth(
  auth: AuthApi,
  redis: RedisTracking,
  headers: AuthHeaders
): Promise<ResolvedAuth | null> {
  const authHeader = headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const rawKey = authHeader.slice(7);
      const result = await auth.api.verifyApiKey({
        body: { key: rawKey },
      });

      if (result.valid && result.key?.organizationId) {
        const keyId = result.key.id;
        const now = Math.floor(Date.now() / 1000);
        redis.set(`api:lastUsed:${keyId}`, String(now)).catch(() => undefined);
        redis.sadd("api:lastUsed:dirty", keyId).catch(() => undefined);

        return {
          organizationId: result.key.organizationId,
          userId: result.key.userId ?? "",
          scopes: parseScopes(
            ((result.key as Record<string, unknown>).scopes as
              | string
              | string[]
              | null
              | undefined) ?? null
          ),
        };
      }
    } catch {
      // Invalid key — fall through to session check
    }
  }

  try {
    const data = await auth.api.getSession({
      headers: headers as HeadersInit,
    });
    if (data?.session?.activeOrganizationId) {
      return {
        organizationId: data.session.activeOrganizationId,
        userId: data.user?.id ?? "",
        scopes: ["*"],
      };
    }
  } catch {
    // No valid session
  }

  return null;
}

export async function validateSession(
  auth: AuthApi,
  headers: Record<string, string>
): Promise<string | null> {
  try {
    const session = await auth.api.getSession({
      headers: headers as HeadersInit,
    });
    return session?.session?.activeOrganizationId ?? null;
  } catch {
    return null;
  }
}

export async function validateSessionWithUser(
  auth: AuthApi,
  headers: Record<string, string>
): Promise<SessionContext | null> {
  try {
    const session = await auth.api.getSession({
      headers: headers as HeadersInit,
    });
    const organizationId = session?.session?.activeOrganizationId;
    const userId = session?.user?.id;
    if (!(organizationId && userId)) {
      return null;
    }
    return { organizationId, userId };
  } catch {
    return null;
  }
}
