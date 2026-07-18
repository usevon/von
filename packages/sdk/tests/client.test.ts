import { afterEach, describe, expect, test } from "bun:test";
import {
  billableMessages,
  limitKindOf,
  MAX_PAYLOAD_BYTES,
  PayloadTooLargeError,
  Von,
} from "../src";

const realFetch = globalThis.fetch;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const captureFetch = () => {
  const bodies: unknown[] = [];
  globalThis.fetch = ((_input: unknown, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    return Promise.resolve(
      new Response(JSON.stringify({ success: true }), { status: 201 })
    );
  }) as typeof fetch;
  return bodies;
};

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("Von Client", () => {
  test("initializes namespace methods", () => {
    const von = new Von();
    expect(von.webhooks).toBeDefined();
    expect(von.endpoints).toBeDefined();
    expect(von.inbound).toBeDefined();
    expect(von.versions).toBeDefined();
  });

  test("send generates an idempotency key by default", async () => {
    const bodies = captureFetch();
    const von = new Von({ apiKey: "von_test" });
    await von.send("order.created", { orderId: 1 });

    const body = bodies[0] as Record<string, unknown>;
    expect(body.eventType).toBe("order.created");
    expect(typeof body.idempotencyKey).toBe("string");
    expect(String(body.idempotencyKey)).toMatch(UUID_RE);
  });

  test("send respects an explicit idempotency key", async () => {
    const bodies = captureFetch();
    const von = new Von({ apiKey: "von_test" });
    await von.send("order.created", { orderId: 1 }, { idempotencyKey: "my-key" });

    const body = bodies[0] as Record<string, unknown>;
    expect(body.idempotencyKey).toBe("my-key");
  });

  test("send omits the key when autoIdempotency is off", async () => {
    const bodies = captureFetch();
    const von = new Von({ apiKey: "von_test", autoIdempotency: false });
    await von.send("order.created", { orderId: 1 });

    const body = bodies[0] as Record<string, unknown>;
    expect(body.idempotencyKey).toBeUndefined();
  });

  test("send retries a 500 with the same idempotency key", async () => {
    const bodies: unknown[] = [];
    let calls = 0;
    globalThis.fetch = ((_input: unknown, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      calls += 1;
      const status = calls === 1 ? 500 : 201;
      return Promise.resolve(
        new Response(JSON.stringify({ success: calls > 1 }), { status })
      );
    }) as typeof fetch;

    const von = new Von({ apiKey: "von_test", retryDelayMs: 1 });
    const result = await von.send("order.created", { orderId: 1 });

    expect(calls).toBe(2);
    expect(result.status).toBe(201);
    const [first, second] = bodies as Record<string, unknown>[];
    expect(first?.idempotencyKey).toBe(second?.idempotencyKey);
  });

  test("send does not retry a 400", async () => {
    let calls = 0;
    globalThis.fetch = (() => {
      calls += 1;
      return Promise.resolve(
        new Response(JSON.stringify({ error: "bad" }), { status: 400 })
      );
    }) as typeof fetch;

    const von = new Von({ apiKey: "von_test", retryDelayMs: 1 });
    const result = await von.send("order.created", { orderId: 1 });

    expect(calls).toBe(1);
    expect(result.status).toBe(400);
  });

  test("send does not retry without an idempotency key", async () => {
    let calls = 0;
    globalThis.fetch = (() => {
      calls += 1;
      return Promise.resolve(
        new Response(JSON.stringify({ error: "boom" }), { status: 500 })
      );
    }) as typeof fetch;

    const von = new Von({
      apiKey: "von_test",
      autoIdempotency: false,
      retryDelayMs: 1,
    });
    const result = await von.send("order.created", { orderId: 1 });

    expect(calls).toBe(1);
    expect(result.status).toBe(500);
  });

  test("send retries a network error", async () => {
    let calls = 0;
    globalThis.fetch = (() => {
      calls += 1;
      if (calls === 1) {
        return Promise.reject(new Error("connection refused"));
      }
      return Promise.resolve(
        new Response(JSON.stringify({ success: true }), { status: 201 })
      );
    }) as typeof fetch;

    const von = new Von({ apiKey: "von_test", retryDelayMs: 1 });
    const result = await von.send("order.created", { orderId: 1 });

    expect(calls).toBe(2);
    expect(result.status).toBe(201);
  });

  test("send rejects a payload over the size limit", async () => {
    const von = new Von({ apiKey: "von_test" });
    const huge = { data: "x".repeat(MAX_PAYLOAD_BYTES + 1) };

    expect(von.send("order.created", huge)).rejects.toThrow(
      PayloadTooLargeError
    );
  });

  test("billableMessages counts one per 64 KiB chunk", () => {
    expect(billableMessages(0)).toBe(1);
    expect(billableMessages(1)).toBe(1);
    expect(billableMessages(64 * 1024)).toBe(1);
    expect(billableMessages(64 * 1024 + 1)).toBe(2);
    expect(billableMessages(200 * 1024)).toBe(4);
  });

  test("limitKindOf separates rate limits from quota", () => {
    expect(
      limitKindOf({ value: { error: { message: "rate limit exceeded for org" } } })
    ).toBe("rate");
    expect(
      limitKindOf({ value: { error: { message: "monthly delivery quota exceeded" } } })
    ).toBe("quota");
    expect(limitKindOf({ value: { error: { message: "boom" } } })).toBe(
      "unknown"
    );
  });

  test("sendBatch generates a key per event", async () => {
    const bodies = captureFetch();
    const von = new Von({ apiKey: "von_test" });
    await von.sendBatch([
      { eventType: "a.created", payload: { i: 1 } },
      { eventType: "b.created", payload: { i: 2 }, idempotencyKey: "fixed" },
    ]);

    const body = bodies[0] as { events: Record<string, unknown>[] };
    expect(body.events).toHaveLength(2);
    expect(typeof body.events[0]?.idempotencyKey).toBe("string");
    expect(body.events[1]?.idempotencyKey).toBe("fixed");
    expect(body.events[0]?.idempotencyKey).not.toBe(
      body.events[1]?.idempotencyKey
    );
  });
});
