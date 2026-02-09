import { createConnection } from "@usevon/queue";
import { type Job, Worker } from "bullmq";
import { env } from "@/env";
import { log } from "@/lib/logger";

export function createWorker<T>(
  name: string,
  processor: (job: Job<T>) => Promise<void>
) {
  const worker = new Worker<T>(name, processor, {
    connection: createConnection(),
    concurrency: env.WORKER_CONCURRENCY,
  });

  worker.on("completed", (job) => {
    log.debug({ jobId: job.id }, `${name} job completed`);
  });

  worker.on("failed", (job, error) => {
    log.error({ jobId: job?.id, error: error.message }, `${name} job failed`);
  });

  return worker;
}
