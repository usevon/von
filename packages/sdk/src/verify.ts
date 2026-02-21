import {
  createHmac,
  timingSafeEqual as nodeTimingSafeEqual,
} from "node:crypto";

function hmacSign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return nodeTimingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

type VerifyOptions = {
  maxAge?: number;
};

/**
 * Verify a webhook signature and parse the payload.
 *
 * @example
 * ```ts
 * import { verifyWebhook } from "@usevon/sdk";
 *
 * app.post("/webhooks", (req) => {
 *   const payload = await req.text();
 *   const signature = req.headers.get("x-von-signature");
 *
 *   try {
 *     const event = verifyWebhook(payload, signature, process.env.WEBHOOK_SECRET);
 *     console.log(event.type, event.data);
 *   } catch (err) {
 *     return new Response("Invalid signature", { status: 401 });
 *   }
 * });
 * ```
 */
export const verifyWebhook = <T = unknown>(
  payload: string,
  signatureHeader: string,
  secret: string,
  options?: VerifyOptions
): T => {
  const maxAge = options?.maxAge ?? 300;

  const parts = signatureHeader.split(",");
  let timestamp: number | null = null;
  let signature: string | null = null;

  for (const part of parts) {
    const trimmed = part.trim();
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex);
    const value = trimmed.slice(eqIndex + 1);
    if (key === "t") {
      timestamp = Number.parseInt(value, 10);
    }
    if (key === "v1") {
      signature = value;
    }
  }

  if (!(timestamp && signature)) {
    throw new WebhookVerificationError("Invalid signature header format");
  }

  const now = Math.floor(Date.now() / 1000);

  // Reject future timestamps (with 60s grace for clock skew)
  if (timestamp > now + 60) {
    throw new WebhookVerificationError("Webhook timestamp in future");
  }

  if (now - timestamp > maxAge) {
    throw new WebhookVerificationError("Webhook timestamp too old");
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = hmacSign(signedPayload, secret);

  if (!timingSafeEqual(expected, signature)) {
    throw new WebhookVerificationError("Invalid signature");
  }

  try {
    return JSON.parse(payload) as T;
  } catch {
    throw new WebhookVerificationError("Invalid JSON payload");
  }
};
