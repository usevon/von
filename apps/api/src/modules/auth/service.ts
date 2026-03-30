import { parseScopes } from "@usevon/auth";
import { hashSha256 } from "@usevon/utils";
import type {
  AuthApi,
  AuthHeaders,
  RedisTracking,
  ResolvedAuth,
  SessionContext,
} from "@/modules/auth/model";

const KEY_CACHE_TTL = 60;

async function resolveApiKey(
  auth: AuthApi,
  redis: RedisTracking,
  rawKey: string
): Promise<ResolvedAuth | null> {
  const keyHash = hashSha256(rawKey).slice(0, 32);
  const cacheKey = `auth:key:${keyHash}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    try {
      const resolved = JSON.parse(cached) as ResolvedAuth;
      return resolved;
    } catch {
      await redis.del(cacheKey);
    }
  }

  const result = await auth.api.verifyApiKey({ body: { key: rawKey } });

  if (!(result.valid && result.key?.organizationId)) {
    return null;
  }

  const keyId = result.key.id;
  const now = Math.floor(Date.now() / 1000);
  redis.set(`api:lastUsed:${keyId}`, String(now)).catch(() => undefined);
  redis.sadd("api:lastUsed:dirty", keyId).catch(() => undefined);

  const resolved: ResolvedAuth = {
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

  redis
    .set(cacheKey, JSON.stringify(resolved), "EX", KEY_CACHE_TTL)
    .catch(() => undefined);

  return resolved;
}

export async function resolveAuth(
  auth: AuthApi,
  redis: RedisTracking,
  headers: AuthHeaders
): Promise<ResolvedAuth | null> {
  const authHeader = headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const resolved = await resolveApiKey(
        auth,
        redis,
        authHeader.slice(7)
      );
      if (resolved) {
        return resolved;
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
