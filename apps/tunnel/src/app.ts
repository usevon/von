import { cors } from "@elysiajs/cors";
import { vonBase } from "@usevon/utils/elysia";
import { Elysia } from "elysia";
import { env } from "@/env";
import { tunnelProxy, tunnelRegister, tunnelWs } from "@/modules/tunnel";

export const app = new Elysia({
  name: "von-tunnel",
  aot: true,
  normalize: true,
  nativeStaticResponse: true,
})
  .use(cors())
  .use(vonBase({ name: "von-tunnel", isProd: env.NODE_ENV === "production" }))
  .use(tunnelRegister)
  .use(tunnelWs)
  .use(tunnelProxy);

export type App = typeof app;
