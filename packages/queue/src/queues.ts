import { Queue } from "bullmq";
import { createConnection } from "@/connection";
import type { InboundForwardingJob, WebhookDeliveryJob } from "@/types";

const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: "exponential" as const,
    delay: 1000,
  },
  removeOnComplete: {
    count: 1000,
    age: 24 * 60 * 60,
  },
  removeOnFail: {
    count: 5000,
    age: 7 * 24 * 60 * 60,
  },
};

let webhookDeliveryQueue: Queue<WebhookDeliveryJob> | null = null;
let inboundForwardingQueue: Queue<InboundForwardingJob> | null = null;

export const getWebhookDeliveryQueue = () => {
  if (!webhookDeliveryQueue) {
    webhookDeliveryQueue = new Queue<WebhookDeliveryJob>("webhook-delivery", {
      connection: createConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }
  return webhookDeliveryQueue;
};

export const getInboundForwardingQueue = () => {
  if (!inboundForwardingQueue) {
    inboundForwardingQueue = new Queue<InboundForwardingJob>(
      "inbound-forwarding",
      {
        connection: createConnection(),
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      }
    );
  }
  return inboundForwardingQueue;
};
