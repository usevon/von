import { db } from "@usevon/db";
import { delivery } from "@usevon/db/schema";
import {
  getWebhookDeliveryQueue,
  type WebhookDeliveryJob,
} from "@usevon/queue";
import { InternalServerError } from "@usevon/utils";
import { inArray } from "drizzle-orm";

export type WebhookDispatchJob = { name: string; data: WebhookDeliveryJob };

export const markWebhookDeliveriesFailed = async (
  deliveryIds: string[]
): Promise<void> => {
  if (deliveryIds.length === 0) {
    return;
  }

  await db
    .update(delivery)
    .set({ status: "failed" })
    .where(inArray(delivery.id, deliveryIds));
};

export const enqueueWebhookDispatchJobs = async (
  jobs: WebhookDispatchJob[]
): Promise<void> => {
  if (jobs.length === 0) {
    return;
  }

  try {
    await getWebhookDeliveryQueue().addBulk(jobs);
  } catch {
    await markWebhookDeliveriesFailed(jobs.map((job) => job.data.deliveryId));
    throw new InternalServerError();
  }
};
