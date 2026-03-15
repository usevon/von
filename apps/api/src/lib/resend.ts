import { ResendClient } from "@usevon/email/client";

import { env } from "@/env";
import { log } from "@/lib/logger";

export type { SendEmailParams } from "@usevon/email/client";

export const resendClient = new ResendClient({
  apiKey: env.RESEND_API_KEY,
  defaultFrom: env.EMAIL_FROM,
  isDev: env.NODE_ENV === "development",
  logger: log,
});
