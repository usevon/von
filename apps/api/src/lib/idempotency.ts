import { cacheGet, cacheSet } from "@usevon/queue";
import { hashSha256 } from "@usevon/utils";
import { Elysia } from "elysia";

const IDEMPOTENCY_TTL = 300;
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH"]);

type CachedResponse = {
  status: number;
  body: unknown;
};

export const idempotency = () =>
  new Elysia({ name: "idempotency" })
    .resolve({ as: "scoped" }, async ({ request, set }) => {
      if (!MUTATING_METHODS.has(request.method)) {
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

      const url = new URL(request.url);
      const bodyText = await request.clone().text();
      const fingerprint = hashSha256(
        `${request.method}:${url.pathname}${url.search}:${hashSha256(bodyText)}`
      );
      const authScope = hashSha256(authHeader).slice(0, 16);
      const cacheKey = `idempotency:${authScope}:${idempotencyKey}:${fingerprint.slice(0, 32)}`;
      const cached = await cacheGet<CachedResponse>(cacheKey);

      if (cached) {
        set.status = cached.status;
        return { idempotencyCached: true, cachedResponse: cached.body };
      }

      return { idempotencyCacheKey: cacheKey, idempotencyCached: false };
    })
    .onBeforeHandle(
      { as: "scoped" },
      ({ idempotencyCached, cachedResponse }) => {
        if (idempotencyCached) {
          return cachedResponse;
        }
      }
    )
    .onAfterHandle(
      { as: "scoped" },
      async ({ idempotencyCacheKey, response, set }) => {
        if (!idempotencyCacheKey) {
          return;
        }

        await cacheSet(idempotencyCacheKey, {
          status: (set.status as number) || 200,
          body: response,
        } satisfies CachedResponse, IDEMPOTENCY_TTL);
      }
    );
