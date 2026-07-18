import { afterEach, describe, expect, test } from "bun:test";
import { Von } from "../src";

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
