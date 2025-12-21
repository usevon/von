import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    BETTER_AUTH_SECRET: z.string().min(1),
    API_KEY_SIGNING_SECRET: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:8080"),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
});
