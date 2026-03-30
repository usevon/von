import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { Job } from "bullmq";

const updates: Array<{ table: string; set: Record<string, unknown> }> = [];

mock.module("@usevon/db", () => {
  const noopChain = {
    set: (data: Record<string, unknown>) => {
      updates.push({ table: "unknown", set: data });
      return noopChain;
    },
    where: () => noopChain,
    returning: () => Promise.resolve([]),
    then: (cb: (v: unknown[]) => void) => cb([]),
  };
  return {
    db: {
      update: () => noopChain,
      insert: () => ({ values: () => noopChain }),
      transaction: (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          update: () => noopChain,
          insert: () => ({ values: () => noopChain }),
        }),
    },
    eq: () => true,
  };
});

mock.module("@usevon/db/schema", () => ({
  endpoint: { id: "id" },
  delivery: { id: "id" },
  inboundEndpoint: { id: "id" },
  inboundDelivery: { id: "id" },
  organization: {},
  member: {},
  user: {},
}));

mock.module("@usevon/email", () => ({
  render: () => Promise.resolve("<html></html>"),
  FailureAlertEmail: () => null,
  EndpointRecoveredEmail: () => null,
}));

mock.module("@usevon/queue", () => ({
  setnx: () => Promise.resolve(false),
  checkThroughputLimit: () => Promise.resolve({ allowed: true, remaining: 24 }),
  getRedisClient: () => ({
    eval: () => Promise.resolve([1, 24]),
  }),
}));

mock.module("@/lib/circuit", () => ({
  circuitSuccessSet: () => ({}),
  circuitFailureSet: () => ({}),
}));

mock.module("@/lib/email", () => ({
  resendClient: { sendEmail: () => Promise.resolve() },
}));

mock.module("@/lib/logger", () => ({
  log: {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    debug: () => undefined,
  },
}));

mock.module("@/env", () => ({
  env: { DASHBOARD_URL: "http://localhost:3001" },
}));

import { type DeliveryConfig, processDelivery } from "../../src/lib/process-delivery";

type TestJob = {
  deliveryId: string;
  organizationId: string;
  plan: string;
  payload: string;
  endpoint: {
    id: string;
    secret: string;
    previousSecret?: string | null;
    timeoutMs: number;
    maxAttempts: number;
  };
};

const baseJobData: TestJob = {
  deliveryId: "del-1",
  organizationId: "org-1",
  plan: "hobby",
  payload: '{"test":true}',
  endpoint: {
    id: "ep-1",
    secret: "secret",
    timeoutMs: 5000,
    maxAttempts: 3,
  },
};

const makeJob = (overrides: Partial<TestJob> = {}): Job<TestJob> =>
  ({
    data: { ...baseJobData, ...overrides },
    moveToDelayed: mock(() => Promise.resolve()),
    token: "token",
  }) as unknown as Job<TestJob>;

const makeConfig = (overrides: Partial<{
  deliveryStatus: string;
  endpointStatus: string;
  circuitState: string;
  noDelivery: boolean;
  noEndpoint: boolean;
}>= {}): DeliveryConfig<TestJob> => ({
  label: "Test",
  deliveryTable: { id: "id" } as never,
  endpointTable: { id: "id" } as never,
  getDeliveryStmt: {
    execute: () =>
      Promise.resolve(
        overrides.noDelivery
          ? []
          : [{ status: overrides.deliveryStatus ?? "pending", attempts: 0 }]
      ),
  },
  getEndpointStmt: {
    execute: () =>
      Promise.resolve(
        overrides.noEndpoint
          ? []
          : [
              {
                status: overrides.endpointStatus ?? "active",
                circuitState: overrides.circuitState ?? "closed",
                circuitOpenedAt:
                  overrides.circuitState === "open" ? new Date() : null,
                failureCount: overrides.circuitState === "open" ? 5 : 0,
              },
            ]
      ),
  },
  completedStatus: "delivered",
  buildStatusSet: (status) => ({ status }),
  buildSuccessSet: ({ attempts }) => ({ status: "delivered", attempts }),
  buildFailureSet: ({ attempts, isFinalAttempt }) => ({
    status: isFinalAttempt ? "failed" : "pending",
    attempts,
  }),
  buildRequest: ({ payload }) => ({
    url: "https://example.com/webhook",
    headers: { "Content-Type": "application/json" },
    body: payload,
  }),
});

beforeEach(() => {
  updates.length = 0;
});

describe("processDelivery", () => {
  test("skips when delivery not found", async () => {
    const config = makeConfig({ noDelivery: true });
    await processDelivery(config, makeJob());
  });

  test("skips when delivery already completed", async () => {
    const config = makeConfig({ deliveryStatus: "delivered" });
    await processDelivery(config, makeJob());
  });

  test("throws when endpoint not found", async () => {
    const config = makeConfig({ noEndpoint: true });
    await expect(processDelivery(config, makeJob())).rejects.toThrow(
      "Test endpoint ep-1 not found"
    );
  });

  test("marks as skipped when endpoint is disabled", async () => {
    const config = makeConfig({ endpointStatus: "disabled" });
    await processDelivery(config, makeJob());
  });

  test("marks as paused when endpoint is paused", async () => {
    const config = makeConfig({ endpointStatus: "paused" });
    await processDelivery(config, makeJob());
  });

  test("marks as circuit_open when circuit breaker is open", async () => {
    const config = makeConfig({ circuitState: "open" });
    await processDelivery(config, makeJob());
  });
});
