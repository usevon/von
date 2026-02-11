import { z } from "zod";

export const env = z
  .object({
    REDIS_URL: z.string().url().optional(),
  })
  .parse(process.env);
