import { cors } from "@elysiajs/cors";
import { checkDatabaseConnection } from "@usevon/db";
import { checkRedisConnection } from "@usevon/queue";
import { BadRequestError, UnauthorizedError } from "@usevon/utils";
import { createLogger } from "@usevon/utils/logger";
import { Elysia } from "elysia";
import { env } from "@/env";
import { tunnelProxy, tunnelRegister, tunnelWs } from "@/modules/tunnel";

const log = createLogger({ name: "tunnel" });
const isProd = env.NODE_ENV === "production";

export const app = new Elysia({
  name: "von-tunnel",
  aot: true,
  normalize: true,
  nativeStaticResponse: true,
})
  .error({ UnauthorizedError, BadRequestError })
  .use(cors())
  .onError(({ code, error, set }) => {
    const statusMap: Record<string, number> = {
      UnauthorizedError: 401,
      NotFoundError: 404,
      BadRequestError: 400,
      ForbiddenError: 403,
      ConflictError: 409,
      InternalServerError: 500,
      VALIDATION: 400,
      NOT_FOUND: 404,
    };
    const status = statusMap[code];
    const message = "message" in error ? error.message : String(error);
    if (status) {
      set.status = status;
      return {
        error: status === 500 && isProd ? "Internal server error" : message,
      };
    }
    log.error({ code, error: message }, "error");
    set.status = 500;
    return { error: isProd ? "Internal server error" : String(error) };
  })
  .get("/live", () => ({ status: "ok", uptime: process.uptime() }))
  .get("/ready", async ({ set }) => {
    const [db, redis] = await Promise.all([
      checkDatabaseConnection(),
      checkRedisConnection(),
    ]);

    const ok = db.ok && redis.ok;
    set.status = ok ? 200 : 503;

    return {
      status: ok ? "ok" : "degraded",
      services: {
        database: db.ok ? "ok" : "unavailable",
        redis: redis.ok ? "ok" : "unavailable",
      },
    };
  })
  .use(tunnelRegister)
  .use(tunnelWs)
  .use(tunnelProxy);

export type App = typeof app;
