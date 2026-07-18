import {
  apiKeyClient,
  createAuthClient,
  organizationClient,
} from "@usevon/auth/client";
import { db, eq } from "@usevon/db";
import { organization, user } from "@usevon/db/schema";
import { app } from "../src/app";
import { startEventBufferFlusher } from "../src/lib/event-buffer";
import { bench, benchConcurrent, printResults, printSummary } from "./utils";

const API_URL = "http://localhost:8080";
const SESSION_COOKIE_RE = /von\.session_token=([^;]+)/;

const stopFlusher = startEventBufferFlusher();

async function setup() {
  const cookieJar = new Headers();
  const authClient = createAuthClient({
    baseURL: API_URL,
    plugins: [organizationClient(), apiKeyClient()],
    fetchOptions: {
      customFetchImpl: async (url, init) => {
        const headers = new Headers(init?.headers);
        const cookie = cookieJar.get("cookie");
        if (cookie && !headers.has("cookie")) {
          headers.set("cookie", cookie);
        }
        if (!headers.has("origin")) {
          headers.set("origin", "http://localhost:3001");
        }
        const response = await app.handle(
          new Request(url, { ...init, headers })
        );
        const setCookie = response.headers.get("set-cookie");
        if (setCookie) {
          const match = setCookie.match(SESSION_COOKIE_RE);
          if (match?.[1]) {
            cookieJar.set("cookie", `von.session_token=${match[1]}`);
          }
        }
        return response;
      },
    },
  });

  const suffix = `bench-${Date.now()}`;
  const email = `${suffix}@bench.test`;
  const password = `BenchPass!${Math.random().toString(36).slice(2)}Aa1`;

  const signup = await authClient.signUp.email({
    name: "Bench User",
    email,
    password,
  });
  if (signup.error || !signup.data?.user?.id) {
    throw new Error(`Signup failed: ${JSON.stringify(signup.error)}`);
  }

  await db
    .update(user)
    .set({ emailVerified: true })
    .where(eq(user.id, signup.data.user.id));

  await authClient.signIn.email({ email, password });

  const org = await authClient.organization.create({
    name: `Bench Org ${suffix.slice(-6)}`,
    slug: `bench-${suffix}`.slice(0, 48),
  });
  if (org.error || !org.data?.id) {
    throw new Error("Org create failed");
  }

  const key = await authClient.apiKey.create({
    name: "Bench Key",
    environment: "dev",
    organizationId: org.data.id,
    scopes: ["*"],
  });
  if (key.error || !key.data?.key) {
    throw new Error("API key create failed");
  }

  return {
    apiKey: key.data.key,
    orgId: org.data.id,
    userId: signup.data.user.id,
  };
}

async function run() {
  console.log("\n  Von API Benchmark\n");

  const { apiKey, orgId, userId } = await setup();
  const headers = {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  };

  // Rotate simulated client IPs so the per-IP rate limit measures real work instead of returning 429s.
  let requestSeq = 0;
  const request = (method: string, path: string, body?: unknown) =>
    app.handle(
      new Request(`${API_URL}${path}`, {
        method,
        headers: {
          ...headers,
          "x-forwarded-for": `10.99.${(requestSeq >> 8) & 0xff}.${requestSeq++ & 0xff}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      })
    );

  let endpointId: string | null = null;
  const all: Awaited<ReturnType<typeof bench>>[] = [];

  let r = await bench("GET / (root)", () =>
    app.handle(new Request(`${API_URL}/`))
  );
  all.push(r);

  r = await bench("GET /live (health)", () =>
    app.handle(new Request(`${API_URL}/live`))
  );
  all.push(r);
  printResults("Health", all.slice(-2));

  r = await bench("POST /endpoints (create)", async () => {
    const res = await request("POST", "/endpoints", {
      url: "https://httpbin.org/post",
    });
    if (res.status === 201) {
      const data = (await res.json()) as { id: string };
      endpointId = data.id;
    }
  }, 30);
  all.push(r);

  r = await bench("GET /endpoints (list)", () =>
    request("GET", "/endpoints")
  );
  all.push(r);

  if (endpointId) {
    r = await bench("GET /endpoints/:id", () =>
      request("GET", `/endpoints/${endpointId}`)
    );
    all.push(r);
  }
  printResults("Endpoints", all.slice(-3));

  r = await bench("POST /webhooks (single)", () =>
    request("POST", "/webhooks", {
      eventType: "bench.test",
      payload: { ts: Date.now() },
    })
  );
  all.push(r);

  r = await bench("POST /webhooks/batch (10)", () =>
    request("POST", "/webhooks/batch", {
      events: Array.from({ length: 10 }, (_, i) => ({
        eventType: "bench.batch",
        payload: { i },
      })),
    }), 30
  );
  all.push(r);

  r = await bench("GET /webhooks/events", () =>
    request("GET", "/webhooks/events")
  );
  all.push(r);

  r = await bench("GET /webhooks/events (filtered)", () =>
    request("GET", "/webhooks/events?eventTypes=bench.test&limit=10")
  );
  all.push(r);
  printResults("Webhooks", all.slice(-4));

  r = await bench("GET /analytics/overview", () =>
    request("GET", "/analytics/overview"), 30
  );
  all.push(r);

  r = await bench("GET /analytics/timeseries", () =>
    request("GET", "/analytics/timeseries?interval=1h"), 30
  );
  all.push(r);
  printResults("Analytics", all.slice(-2));

  r = await benchConcurrent("GET events (10x concurrent)", () =>
    request("GET", "/webhooks/events?limit=5")
  );
  all.push(r);

  r = await benchConcurrent("POST webhooks (10x concurrent)", () =>
    request("POST", "/webhooks", {
      eventType: "bench.concurrent",
      payload: { ts: Date.now() },
    })
  );
  all.push(r);
  printResults("Concurrent", all.slice(-2));

  printSummary(all);

  await new Promise((resolve) => setTimeout(resolve, 200));
  stopFlusher();
  try {
    await db.delete(organization).where(eq(organization.id, orgId));
  } catch {
    // best effort
  }
  try {
    await db.delete(user).where(eq(user.id, userId));
  } catch {
    // best effort
  }
  process.exit(0);
}

run().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
