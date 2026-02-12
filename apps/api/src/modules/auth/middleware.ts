import { hasScope } from "@usevon/auth";
import { Elysia } from "elysia";
import { rateLimit } from "@/lib/rate-limit";
import type { AuthApi, RedisTracking } from "@/modules/auth/model";
import { resolveAuth } from "@/modules/auth/service";

export type CreateVonAuthOptions = {
  useRateLimit?: boolean;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
  rateLimitKeyPrefix?: string;
  rateLimitFailOpen?: boolean;
};

export const createVonAuth = (
  deps: { auth: AuthApi; redis: RedisTracking },
  options: CreateVonAuthOptions = {}
) => {
  const {
    useRateLimit = true,
    rateLimitWindowMs = 60_000,
    rateLimitMax = 200,
    rateLimitKeyPrefix = "rl:auth",
    rateLimitFailOpen = true,
  } = options;

  return (scope: string) => {
    const plugin = useRateLimit
      ? new Elysia({ name: `auth:${scope}` }).use(
          rateLimit({
            windowMs: rateLimitWindowMs,
            max: rateLimitMax,
            keyPrefix: rateLimitKeyPrefix,
            failOpen: rateLimitFailOpen,
          })
        )
      : new Elysia({ name: `auth:${scope}` });

    return plugin.resolve({ as: "scoped" }, async ({ headers, status }) => {
      const result = await resolveAuth(deps.auth, deps.redis, headers);
      if (!result) {
        return status(401, {
          error: "Please sign in or provide a valid API key.",
        });
      }

      if (!hasScope(result.scopes, scope)) {
        return status(403, { error: "API key lacks required scope" });
      }

      return result;
    });
  };
};
