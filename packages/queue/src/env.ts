import { createEnv, z } from "@von/env"

export const env = createEnv({
  server: {
    REDIS_URL: z.string().url().optional(),
  },
  runtimeEnv: process.env,
})
