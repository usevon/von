import { createEnv, z } from "@von/env"

export const env = createEnv({
  server: {
    PORT: z.coerce.number().default(8080),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url().optional(),
    CORS_ORIGINS: z.string().optional(),
  },
  runtimeEnv: process.env,
})
