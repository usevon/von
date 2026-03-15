import { Resend } from "resend";

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
};

export type ResendClientConfig = {
  apiKey?: string;
  defaultFrom: string;
  isDev?: boolean;
  logger: {
    info: (obj: Record<string, unknown>, msg: string) => void;
    error: (obj: Record<string, unknown>, msg: string) => void;
  };
};

export class ResendClient {
  private readonly resend: Resend | null = null;
  private readonly defaultFrom: string;
  private readonly logger: ResendClientConfig["logger"];

  constructor(config: ResendClientConfig) {
    this.defaultFrom = config.defaultFrom;
    this.logger = config.logger;

    if (!config.apiKey) {
      if (config.isDev) {
        this.logger.info(
          {},
          "Resend API key not provided, emails will be logged"
        );
      }
      return;
    }
    this.resend = new Resend(config.apiKey);
    this.logger.info({}, "Resend client initialized");
  }

  sendEmail = async ({
    to,
    subject,
    html,
    from = this.defaultFrom,
  }: SendEmailParams) => {
    if (!this.resend) {
      this.logger.info({ to, subject }, "[Email] (dev fallback)");
      return null;
    }

    const result = await this.resend.emails.send({ from, to, subject, html });

    if (result.error) {
      this.logger.error(
        { error: result.error, to, subject },
        "Failed to send email"
      );
      throw new Error(`Email send failed: ${result.error.message}`);
    }

    this.logger.info({ to, subject }, "Email sent via Resend");
    return result;
  };
}
