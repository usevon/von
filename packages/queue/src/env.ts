import { createEnv, z } from "@usevon/utils/env";

export const env = createEnv({
  server: {
    REDIS_URL: z.string().url().optional(),
  },
  runtimeEnv: process.env,
});
