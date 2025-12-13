import { createEnv, z } from "@usevon/utils/env"

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
  },
  runtimeEnv: process.env,
})
