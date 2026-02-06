import { createEnv, z } from "@usevon/utils/env";

export const env = createEnv({
  server: {
    PORT: z.coerce.number().default(8080),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url().optional(),
    DASHBOARD_URL: z.string().url().optional(),
    CORS_ORIGINS: z.string().optional(),
    API_URL: z.string().url().optional(),
    API_KEY_SIGNING_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    MAX_TUNNELS_PER_ORG: z.coerce.number().default(3),
  },
  runtimeEnv: process.env,
});
