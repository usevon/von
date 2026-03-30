import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { env } from "@/env";
import { csrfProtection } from "@/lib/csrf";
import { apiBase, baseElysiaOptions } from "@/lib/elysia-base";
import { getCorsOrigins } from "@/lib/origins";
import { idempotency } from "@/lib/idempotency";
import { log } from "@/lib/logger";
import { requestGuards } from "@/lib/request-guards";
import { analyticsRead } from "@/modules/analytics";
import { auditLogRead } from "@/modules/audit-log";
import { auth } from "@/modules/auth";
import { endpointsRead, endpointsWrite } from "@/modules/endpoints";
import { inboundPublic, inboundRead, inboundWrite } from "@/modules/inbound";
import {
  tunnelProxy,
  tunnelRegisterRead,
  tunnelRegisterWrite,
  tunnelWs,
} from "@/modules/tunnel";
import { versionsRead, versionsWrite } from "@/modules/versions";
import {
  webhookEventsRead,
  webhookEventsWrite,
  webhooks,
} from "@/modules/webhooks";

const corsMiddleware = cors({ origin: getCorsOrigins(), credentials: true });

const securityHeaders = new Elysia({ name: "security-headers" }).onAfterHandle(
  { as: "global" },
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
  .use(
    apiBase({
      name: "von-api",
      isProd: env.NODE_ENV === "production",
      logger: log,
    })
  )
  .use(requestGuards())
  .use(idempotency())
  .use(corsMiddleware)
  .use(csrfProtection())
  .mount(auth.handler)
  .use(tunnelRegisterWrite)
  .use(tunnelRegisterRead)
  .use(tunnelWs)
  .use(inboundPublic)
  .use(webhooks)
  .use(webhookEventsRead)
  .use(webhookEventsWrite)
  .use(endpointsRead)
  .use(endpointsWrite)
  .use(inboundRead)
  .use(inboundWrite)
  .use(versionsRead)
  .use(versionsWrite)
  .use(analyticsRead)
  .use(auditLogRead)
  .group("/t", (group) => group.use(tunnelProxy));

export type App = typeof app;
