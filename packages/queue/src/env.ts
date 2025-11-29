import { createEnv, z } from "@usevon/env"

export const env = createEnv({
  server: {
    REDIS_URL: z.string().url().optional(),
  },
  runtimeEnv: process.env,
})
