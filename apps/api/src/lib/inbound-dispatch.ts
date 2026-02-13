import { db } from "@usevon/db";
import { inboundDelivery } from "@usevon/db/schema";
import {
  getInboundForwardingQueue,
  type InboundForwardingJob,
} from "@usevon/queue";
import { InternalServerError } from "@usevon/utils";
import { eq } from "drizzle-orm";

export const enqueueInboundForwardingJob = async (
  job: InboundForwardingJob
): Promise<void> => {
  try {
    await getInboundForwardingQueue().add("inbound-forwarding", job, {
      attempts: job.endpoint.maxAttempts,
    });
  } catch {
    await db
      .update(inboundDelivery)
      .set({ status: "failed" })
      .where(eq(inboundDelivery.id, job.deliveryId));
    throw new InternalServerError();
  }
};
