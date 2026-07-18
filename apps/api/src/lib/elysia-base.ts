import { checkDatabaseConnection } from "@usevon/db";
import { checkRedisConnection } from "@usevon/queue";
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} from "@usevon/utils";
import { Elysia } from "elysia";
import type { Logger } from "pino";

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

const errorBody = (message: string, status: number) => ({
  error: { message, retryable: RETRYABLE_STATUSES.has(status) },
});

export const baseElysiaOptions = {
  aot: true,
  normalize: true,
  nativeStaticResponse: true,
} as const;

type ApiBaseOptions = {
  name: string;
  isProd: boolean;
  logger?: Logger;
};

export const apiBase = (opts: ApiBaseOptions) =>
  new Elysia({ name: `${opts.name}-base` })
    .error({
      UnauthorizedError,
      ForbiddenError,
      NotFoundError,
      BadRequestError,
      TooManyRequestsError,
      InternalServerError,
    })
    .onError({ as: "global" }, ({ code, error, set }) => {
      // Shape matches the rust service so a client cannot tell which one answered.
      if (code === "VALIDATION") {
        set.status = 400;
        return errorBody(
          "message" in error ? error.message : "Validation error",
          400
        );
      }
      if (code === "NOT_FOUND") {
        set.status = 404;
        return errorBody("Not found", 404);
      }

      const status = "status" in error ? (error.status as number) : 500;
      const message = "message" in error ? error.message : String(error);

      if (status >= 500 && opts.logger) {
        opts.logger.error({ error }, message);
      }

      set.status = status;
      return errorBody(
        status === 500 && opts.isProd ? "Internal server error" : message,
        status
      );
    })
    .get("/", () => ({ name: opts.name, status: "ok" }))
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
    });
