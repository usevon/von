import { cors } from "@elysiajs/cors";
import { vonBase } from "@usevon/utils/elysia";
import { Elysia } from "elysia";
import { env } from "@/env";
import { idempotency } from "@/lib/idempotency";
import { auth, withApiKey } from "@/modules/auth";
import { endpoints } from "@/modules/endpoints";
import { inbound, inboundPublic } from "@/modules/inbound";
import { versions } from "@/modules/versions";
import { webhookEvents, webhooks } from "@/modules/webhooks";

const ping = new Elysia({ prefix: "/ping" })
  .use(withApiKey)
  .get("/", () => ({ ok: true }));

const getCorsOrigins = () => {
  if (env.NODE_ENV !== "production") {
    return ["http://localhost:5173", "http://localhost:5174"];
  }
  if (!env.CORS_ORIGINS) {
    throw new Error("CORS_ORIGINS required in production");
  }
  return env.CORS_ORIGINS.split(",").map((o) => o.trim());
};

const corsMiddleware = cors({ origin: getCorsOrigins() });

const browserRoutes = new Elysia().use(corsMiddleware).use(auth);

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
  aot: true,
  normalize: true,
  nativeStaticResponse: true,
})
  .use(securityHeaders)
  .use(vonBase({ name: "von-api", isProd: env.NODE_ENV === "production" }))
  .use(idempotency())
  .use(browserRoutes)
  .use(ping)
  .use(inboundPublic)
  .use(webhooks)
  .use(webhookEvents)
  .use(endpoints)
  .use(inbound)
  .use(versions);

export type App = typeof app;
