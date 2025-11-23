import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url().optional(),
    PORT: z.coerce.number().default(8080),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    API_BASE_URL: z.string().url().optional(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})

export type ServerEnv = typeof env
