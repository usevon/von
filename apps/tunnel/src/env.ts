import { createEnv, z } from "@usevon/utils/env"

export const env = createEnv({
  server: {
    PORT: z.coerce.number().default(8081),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    BETTER_AUTH_SECRET: z.string().min(32),
    TUNNEL_URL: z.string().url().optional(),
    MAX_TUNNELS_PER_ORG: z.coerce.number().default(3),
  },
  runtimeEnv: process.env,
})
