import { getRedisClient } from "@usevon/queue";
import { hashSha256 } from "@usevon/utils";
import { Elysia } from "elysia";

const redis = getRedisClient();
const IDEMPOTENCY_TTL = 60 * 5; // 5 minutes

type CachedResponse = {
  status: number;
  body: unknown;
};

export const buildRequestFingerprint = async (
  request: Request
): Promise<string> => {
  const url = new URL(request.url);
  const body = await request.clone().text();
  const bodyHash = hashSha256(body);
  return hashSha256(
    `${request.method}:${url.pathname}${url.search}:${bodyHash}`
  );
};

export const idempotency = () =>
  new Elysia({ name: "idempotency" })
    .resolve({ as: "global" }, async ({ request, set }) => {
      const method = request.method;

      if (!["POST", "PUT", "PATCH"].includes(method)) {
        return {};
      }

      const idempotencyKey = request.headers.get("x-idempotency-key");
      if (!idempotencyKey) {
        return {};
      }

      const authHeader = request.headers.get("authorization");
      if (!authHeader) {
        return {};
      }

      const authScope = hashSha256(authHeader).slice(0, 16);
      const fingerprint = await buildRequestFingerprint(request);
      const cacheKey = `idempotency:${authScope}:${idempotencyKey}:${fingerprint.slice(0, 32)}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        try {
          const response: CachedResponse = JSON.parse(cached);
          set.status = response.status;
          return { idempotencyCached: true, cachedResponse: response.body };
        } catch {
          await redis.del(cacheKey);
        }
      }

      return { idempotencyCacheKey: cacheKey, idempotencyCached: false };
    })
    .onBeforeHandle(
      { as: "global" },
      ({ idempotencyCached, cachedResponse }) => {
        if (idempotencyCached) {
          return cachedResponse;
        }
      }
    )
    .onAfterHandle(
      { as: "global" },
      async ({ idempotencyCacheKey, response, set }) => {
        if (!idempotencyCacheKey) {
          return;
        }

        const toCache: CachedResponse = {
          status: (set.status as number) || 200,
          body: response,
        };

        await redis.setex(
          idempotencyCacheKey,
          IDEMPOTENCY_TTL,
          JSON.stringify(toCache)
        );
      }
    );
