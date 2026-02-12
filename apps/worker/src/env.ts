import { z } from "zod";

export const env = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    WORKER_CONCURRENCY: z.coerce.number().min(1).max(500).default(50),
    RETENTION_CLEANUP_ENABLED: z.coerce.boolean().default(true),
    RETENTION_CLEANUP_INTERVAL_MS: z.coerce
      .number()
      .min(60_000)
      .default(60 * 60 * 1000),
    EVENT_RETENTION_DAYS: z.coerce.number().min(1).default(90),
    DELIVERY_RETENTION_DAYS: z.coerce.number().min(1).default(90),
    INBOUND_DELIVERY_RETENTION_DAYS: z.coerce.number().min(1).default(90),
  })
  .parse(process.env);
