import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    BETTER_AUTH_SECRET: z.string().min(1),
    API_KEY_SIGNING_SECRET: z.string().min(1),
  },
  experimental__runtimeEnv: {},
});
