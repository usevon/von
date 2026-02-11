import { z } from "zod";

export const env = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    WORKER_CONCURRENCY: z.coerce.number().min(1).max(500).default(50),
  })
  .parse(process.env);
