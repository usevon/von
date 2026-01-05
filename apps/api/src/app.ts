import { cors } from "@elysiajs/cors";
import { baseElysiaOptions, vonBase } from "@usevon/utils/elysia";
import { Elysia } from "elysia";
import { env } from "@/env";
import { idempotency } from "@/lib/idempotency";
import { auth } from "@/modules/auth";
import { endpoints } from "@/modules/endpoints";
import { inbound, inboundPublic } from "@/modules/inbound";
import { versions } from "@/modules/versions";
import { webhookEvents, webhooks } from "@/modules/webhooks";

const getCorsOrigins = () => {
  if (env.CORS_ORIGINS) {
    return env.CORS_ORIGINS.split(",").map((o) => o.trim());
  }
  if (env.NODE_ENV === "production") {
    throw new Error("CORS_ORIGINS required in production");
  }
  return [env.DASHBOARD_URL ?? "http://localhost:3001"];
};

const corsMiddleware = cors({ origin: getCorsOrigins(), credentials: true });

const browserMiddleware = new Elysia().use(corsMiddleware).use(auth);

const securityHeaders = new Elysia({ name: "security-headers" }).onAfterHandle(
  ({ set }) => {
    set.headers["X-Content-Type-Options"] = "nosniff";
    set.headers["X-Frame-Options"] = "DENY";
    set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    if (env.NODE_ENV === "production") {
      set.headers["Strict-Transport-Security"] =
        "max-age=31536000; includeSubDomains";
    }
  }
);

export const app = new Elysia({
  name: "von-api",
  ...baseElysiaOptions,
})
  .use(securityHeaders)
  .use(vonBase({ name: "von-api", isProd: env.NODE_ENV === "production" }))
  .use(idempotency())
  .use(browserMiddleware)
  .use(inboundPublic)
  .use(webhooks)
  .use(webhookEvents)
  .use(endpoints)
  .use(inbound)
  .use(versions);

export type App = typeof app;
