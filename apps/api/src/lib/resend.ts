import { Resend } from "resend";

import { env } from "@/env";
import { log } from "@/lib/logger";

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
};

class ResendClient {
  private readonly resend: Resend | null = null;

  constructor() {
    if (!env.RESEND_API_KEY) {
      if (env.NODE_ENV === "development") {
        log.info("Resend API key not provided, emails will be logged");
      }
      return;
    }
    this.resend = new Resend(env.RESEND_API_KEY);
    log.info("Resend client initialized");
  }

  sendEmail = async ({
    to,
    subject,
    html,
    from = env.EMAIL_FROM,
  }: SendEmailParams) => {
    if (!this.resend) {
      log.info({ to, subject }, "[Email] (dev fallback)");
      return null;
    }

    const result = await this.resend.emails.send({ from, to, subject, html });

    if (result.error) {
      log.error({ error: result.error, to, subject }, "Failed to send email");
      throw new Error(`Email send failed: ${result.error.message}`);
    }

    log.info({ to, subject }, "Email sent via Resend");
    return result;
  };
}

export const resendClient = new ResendClient();
