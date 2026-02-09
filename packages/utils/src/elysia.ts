import { checkDatabaseConnection } from "@usevon/db";
import { checkRedisConnection } from "@usevon/queue";
import { Elysia } from "elysia";
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "@/errors";

/**
 * Base Elysia configuration options for all Von apps.
 * Enables AOT compilation and optimizations.
 */
export const baseElysiaOptions = {
  aot: true,
  normalize: true,
  nativeStaticResponse: true,
} as const;

type VonBaseOptions = {
  name: string;
  isProd: boolean;
};

/**
 * Shared Elysia plugin providing error handling and health endpoints.
 *
 * @example
 * ```ts
 * const app = new Elysia({ name: "my-app" })
 *   .use(vonBase({ name: "my-app", isProd: true }))
 *   .get("/hello", () => "world");
 * ```
 */
export const vonBase = (opts: VonBaseOptions) =>
  new Elysia({ name: `${opts.name}-base` })
    .error({
      UnauthorizedError,
      NotFoundError,
      BadRequestError,
      InternalServerError,
    })
    .onError(({ code, error, set }) => {
      // Handle Elysia built-in codes
      if (code === "VALIDATION") {
        set.status = 400;
        return {
          error: "message" in error ? error.message : "Validation error",
        };
      }
      if (code === "NOT_FOUND") {
        set.status = 404;
        return { error: "Not found" };
      }

      // Handle custom errors with status property
      const status = "status" in error ? (error.status as number) : 500;
      const message = "message" in error ? error.message : String(error);

      set.status = status;
      return {
        error:
          status === 500 && opts.isProd ? "Internal server error" : message,
      };
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
