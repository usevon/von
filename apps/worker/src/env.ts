import { createEnv, z } from "@usevon/utils/env"

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    WORKER_CONCURRENCY: z.coerce.number().min(1).max(500).default(50),
  },
  runtimeEnv: process.env,
})
