import { db } from "@usevon/db";
import { inboundDelivery } from "@usevon/db/schema";
import {
  getInboundForwardingQueue,
  type InboundForwardingJob,
} from "@usevon/queue";
import { eq } from "drizzle-orm";
import { dispatchWithFailureHandler } from "@/lib/queue-dispatch";

export const enqueueInboundForwardingJob = async (
  job: InboundForwardingJob
): Promise<void> => {
  await dispatchWithFailureHandler(
    () =>
      getInboundForwardingQueue().add("inbound-forwarding", job, {
        attempts: job.endpoint.maxAttempts,
      }),
    () =>
      db
        .update(inboundDelivery)
        .set({ status: "failed" })
        .where(eq(inboundDelivery.id, job.deliveryId))
  );
};
