import { getRedisClient } from "@usevon/queue";
import { TooManyRequestsError } from "@usevon/utils";
import { Elysia } from "elysia";

const redis = getRedisClient();

type RateLimitContext = {
  request: Request;
  set: { status?: number | string; headers: Record<string, string | number> };
};

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  getKey?: (ctx: RateLimitContext) => string | null;
};

export const getClientIp = (request: Request): string => {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim());
    return ips[0] ?? "unknown";
  }
  return "unknown";
};

const RATE_LIMIT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return current
`;

const createRateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    keyPrefix = "ratelimit",
    getKey = (ctx) => getClientIp(ctx.request),
  } = options;
  const windowSeconds = Math.ceil(windowMs / 1000);

  return new Elysia().onBeforeHandle({ as: "scoped" },
    async (ctx: RateLimitContext) => {
      const identifier = getKey(ctx);
      if (!identifier) return;

      const key = `${keyPrefix}:${identifier}`;

      let current: number;
      try {
        current = (await redis.eval(
          RATE_LIMIT_SCRIPT,
          1,
          key,
          windowSeconds
        )) as number;
      } catch {
        // Fail open — allow request if Redis is unavailable
        return;
      }

      const remaining = Math.max(0, max - current);

      ctx.set.headers["X-RateLimit-Limit"] = String(max);
      ctx.set.headers["X-RateLimit-Remaining"] = String(remaining);
      ctx.set.headers["X-RateLimit-Reset"] = String(
        Math.ceil(Date.now() / 1000) + windowSeconds
      );

      if (current > max) {
        ctx.set.headers["Retry-After"] = String(windowSeconds);
        throw new TooManyRequestsError();
      }
    }
  );
};

export const rateLimit = (options: Omit<RateLimitOptions, "getKey">) =>
  createRateLimiter(options);
