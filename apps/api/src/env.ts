import { z } from "zod";

const envSchema = z
  .object({
    PORT: z.coerce.number().default(8080),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url().optional(),
    DASHBOARD_URL: z.string().url().optional(),
    CORS_ORIGINS: z.string().optional(),
    API_KEY_SIGNING_SECRET: z.string().optional(),
    SECRET_ENCRYPTION_KEY: z.string().optional(),
    API_MAX_BODY_BYTES: z.coerce.number().min(1).default(1_000_000),
    API_MAX_URL_LENGTH: z.coerce.number().min(1).default(2048),
    MAX_ENDPOINT_IDS_PER_REQUEST: z.coerce.number().min(1).default(100),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    MAX_TUNNELS_PER_ORG: z.coerce.number().default(3),
    WEBHOOK_BATCH_MAX_EVENTS: z.coerce.number().default(100),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("Von <noreply@usevon.com>"),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production" && !value.SECRET_ENCRYPTION_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SECRET_ENCRYPTION_KEY"],
        message: "SECRET_ENCRYPTION_KEY is required in production",
      });
    }
  });

export const env = envSchema.parse(process.env);
