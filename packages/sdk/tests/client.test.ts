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

type CapturedRequest = { url: string; method: string; body: unknown };

const captureRequests = () => {
  const requests: CapturedRequest[] = [];
  globalThis.fetch = ((input: unknown, init?: RequestInit) => {
    requests.push({
      url: String(input),
      method: String(init?.method),
      body:
        init?.body === undefined ? undefined : JSON.parse(String(init.body)),
    });
    return Promise.resolve(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
  }) as typeof fetch;
  return requests;
};

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
    await von.send(
      "order.created",
      { orderId: 1 },
      { idempotencyKey: "my-key" }
    );

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

    await expect(von.send("order.created", huge)).rejects.toThrow(
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
      limitKindOf({
        value: { error: { message: "rate limit exceeded for org" } },
      })
    ).toBe("rate");
    expect(
      limitKindOf({
        value: { error: { message: "monthly delivery quota exceeded" } },
      })
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

describe("WebhooksResource deliveries and replay", () => {
  test("listDeliveries targets the event deliveries path", async () => {
    const requests = captureRequests();
    const von = new Von({ baseUrl: "https://api.test", apiKey: "von_test" });
    await von.webhooks.listDeliveries("evt_xxx", {
      status: "failed",
      endpointId: "ep_xxx",
      limit: 50,
    });

    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.url).toBe(
      "https://api.test/webhooks/events/evt_xxx/deliveries?status=failed&endpointId=ep_xxx&limit=50"
    );
  });

  test("listAttempts targets the delivery attempts path", async () => {
    const requests = captureRequests();
    const von = new Von({ baseUrl: "https://api.test", apiKey: "von_test" });
    await von.webhooks.listAttempts("dlv_xxx", { sort: "desc", limit: 10 });

    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.url).toBe(
      "https://api.test/webhooks/deliveries/dlv_xxx/attempts?sort=desc&limit=10"
    );
  });

  test("encodes ids in the delivery paths", async () => {
    const requests = captureRequests();
    const von = new Von({ baseUrl: "https://api.test", apiKey: "von_test" });
    await von.webhooks.listDeliveries("evt/xxx");
    await von.webhooks.listAttempts("dlv/xxx");

    expect(requests[0]?.url).toBe(
      "https://api.test/webhooks/events/evt%2Fxxx/deliveries"
    );
    expect(requests[1]?.url).toBe(
      "https://api.test/webhooks/deliveries/dlv%2Fxxx/attempts"
    );
  });

  test("replay posts an empty body by default", async () => {
    const requests = captureRequests();
    const von = new Von({ baseUrl: "https://api.test", apiKey: "von_test" });
    await von.webhooks.replay("evt_xxx");

    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toBe(
      "https://api.test/webhooks/events/evt_xxx/replay"
    );
    expect(requests[0]?.body).toEqual({});
  });

  test("replay forwards endpoint ids", async () => {
    const requests = captureRequests();
    const von = new Von({ baseUrl: "https://api.test", apiKey: "von_test" });
    await von.webhooks.replay("evt_xxx", { endpointIds: ["ep_a", "ep_b"] });

    expect(requests[0]?.body).toEqual({ endpointIds: ["ep_a", "ep_b"] });
  });

  test("replayBulk posts to the bulk replay path", async () => {
    const requests = captureRequests();
    const von = new Von({ baseUrl: "https://api.test", apiKey: "von_test" });
    await von.webhooks.replayBulk({
      since: "2025-01-01T00:00:00Z",
      status: "failed",
    });

    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toBe("https://api.test/webhooks/events/replay");
    expect(requests[0]?.body).toEqual({
      since: "2025-01-01T00:00:00Z",
      status: "failed",
    });
  });

  test("returns the error branch when the event is missing", async () => {
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: "Event not found" }), {
          status: 404,
        })
      )) as typeof fetch;

    const von = new Von({ baseUrl: "https://api.test", apiKey: "von_test" });
    const { data, error, status } = await von.webhooks.replay("nope");

    expect(data).toBeNull();
    expect(status).toBe(404);
    expect(error?.message).toBe("Event not found");
  });
});

describe("InboundResource", () => {
  test("create posts to /inbound", async () => {
    const requests = captureRequests();
    const von = new Von({ baseUrl: "https://api.test", apiKey: "von_test" });
    await von.inbound.create({
      forwardUrl: "https://app.test/webhooks/stripe",
      provider: "stripe",
    });

    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toBe("https://api.test/inbound");
    expect(requests[0]?.body).toEqual({
      forwardUrl: "https://app.test/webhooks/stripe",
      provider: "stripe",
    });
  });

  test("list passes pagination as query params", async () => {
    const requests = captureRequests();
    const von = new Von({ baseUrl: "https://api.test", apiKey: "von_test" });
    await von.inbound.list({ limit: 20, cursor: "abc" });

    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.url).toBe(
      "https://api.test/inbound?limit=20&cursor=abc"
    );
  });

  test("get, update, and delete target the endpoint path", async () => {
    const requests = captureRequests();
    const von = new Von({ baseUrl: "https://api.test", apiKey: "von_test" });
    await von.inbound.get("in_xxx");
    await von.inbound.update("in_xxx", { status: "paused" });
    await von.inbound.delete("in_xxx");

    expect(requests.map((r) => r.method)).toEqual(["GET", "PATCH", "DELETE"]);
    for (const request of requests) {
      expect(request.url).toBe("https://api.test/inbound/in_xxx");
    }
    expect(requests[1]?.body).toEqual({ status: "paused" });
  });
});

describe("VersionsResource", () => {
  test("create posts to /versions", async () => {
    const requests = captureRequests();
    const von = new Von({ baseUrl: "https://api.test", apiKey: "von_test" });
    await von.versions.create({
      version: "2025-01-15",
      transforms: { "order.created": { remove: ["internal_notes"] } },
    });

    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toBe("https://api.test/versions");
    expect(requests[0]?.body).toEqual({
      version: "2025-01-15",
      transforms: { "order.created": { remove: ["internal_notes"] } },
    });
  });

  test("get, update, and delete are keyed by version string", async () => {
    const requests = captureRequests();
    const von = new Von({ baseUrl: "https://api.test", apiKey: "von_test" });
    await von.versions.get("2025-01-15");
    await von.versions.update("2025-01-15", { transforms: {} });
    await von.versions.delete("2025-01-15");

    expect(requests.map((r) => r.method)).toEqual(["GET", "PATCH", "DELETE"]);
    for (const request of requests) {
      expect(request.url).toBe("https://api.test/versions/2025-01-15");
    }
    expect(requests[1]?.body).toEqual({ transforms: {} });
  });

  test("returns the error branch on a 404", async () => {
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: "Version not found" }), {
          status: 404,
        })
      )) as typeof fetch;

    const von = new Von({ baseUrl: "https://api.test", apiKey: "von_test" });
    const { data, error, status } = await von.versions.get("nope");

    expect(data).toBeNull();
    expect(status).toBe(404);
    expect(error?.message).toBe("Version not found");
  });
});
