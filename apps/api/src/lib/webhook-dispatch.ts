import { db } from "@usevon/db";
import { delivery } from "@usevon/db/schema";
import {
  getWebhookDeliveryQueue,
  type WebhookDeliveryJob,
} from "@usevon/queue";
import { inArray } from "drizzle-orm";
import { dispatchWithFailureHandler } from "@/lib/queue-dispatch";

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

  await dispatchWithFailureHandler(
    () =>
      getWebhookDeliveryQueue().addBulk(
        jobs.map((job) => ({
          ...job,
          opts: {
            attempts: job.data.maxAttempts,
          },
        }))
      ),
    () => markWebhookDeliveriesFailed(jobs.map((job) => job.data.deliveryId))
  );
};
