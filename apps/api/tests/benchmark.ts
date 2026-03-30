/**
 * Von API Benchmark
 *
 * Tests read/write throughput and latency using in-process app.handle().
 * No network overhead — measures pure application performance.
 *
 * Usage: bun run --cwd apps/api tests/benchmark.ts
 */

import {
  apiKeyClient,
  createAuthClient,
  organizationClient,
} from "@usevon/auth/client";

const SESSION_COOKIE_RE = /von\.session_token=([^;]+)/;
import { db, eq } from "@usevon/db";
import { organization, user } from "@usevon/db/schema";
import { app } from "../src/app";

const API_URL = "http://localhost:8080";

type Stats = {
  name: string;
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  rps: number;
};

function computeStats(name: string, durations: number[]): Stats {
  const sorted = [...durations].sort((a, b) => a - b);
  const total = sorted.reduce((a, b) => a + b, 0);
  return {
    name,
    count: sorted.length,
    totalMs: Math.round(total * 100) / 100,
    minMs: Math.round(sorted[0] * 100) / 100,
    maxMs: Math.round(sorted.at(-1) * 100) / 100,
    p50Ms:
      Math.round(sorted[Math.floor(sorted.length * 0.5)] * 100) / 100,
    p95Ms:
      Math.round(sorted[Math.floor(sorted.length * 0.95)] * 100) / 100,
    p99Ms:
      Math.round(sorted[Math.floor(sorted.length * 0.99)] * 100) / 100,
    rps: Math.round((sorted.length / (total / 1000)) * 100) / 100,
  };
}

function printStats(stats: Stats) {
  console.log(
    `  ${stats.name.padEnd(35)} ${String(stats.count).padStart(6)} reqs | ` +
      `p50 ${String(stats.p50Ms).padStart(7)}ms | ` +
      `p95 ${String(stats.p95Ms).padStart(7)}ms | ` +
      `p99 ${String(stats.p99Ms).padStart(7)}ms | ` +
      `${String(stats.rps).padStart(10)} req/s`
  );
}

async function bench(
  name: string,
  iterations: number,
  fn: () => Promise<void>
): Promise<Stats> {
  // Warmup
  for (let i = 0; i < Math.min(5, iterations); i++) {
    await fn();
  }

  const durations: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    durations.push(performance.now() - start);
  }
  return computeStats(name, durations);
}

async function benchConcurrent(
  name: string,
  iterations: number,
  concurrency: number,
  fn: () => Promise<void>
): Promise<Stats> {
  // Warmup
  for (let i = 0; i < Math.min(5, iterations); i++) {
    await fn();
  }

  const durations: number[] = [];
  const batches = Math.ceil(iterations / concurrency);

  for (let b = 0; b < batches; b++) {
    const batchSize = Math.min(concurrency, iterations - b * concurrency);
    const promises = Array.from({ length: batchSize }, async () => {
      const start = performance.now();
      await fn();
      return performance.now() - start;
    });
    const results = await Promise.all(promises);
    durations.push(...results);
  }

  return computeStats(name, durations);
}

// --- Setup ---

async function setupTestResources(): Promise<{
  apiKey: string;
  orgId: string;
  userId: string;
}> {
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
        const response = await app.handle(new Request(url, { ...init, headers }));
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

  const signin = await authClient.signIn.email({ email, password });
  if (signin.error) {
    throw new Error(`Signin failed: ${JSON.stringify(signin.error)}`);
  }

  const org = await authClient.organization.create({
    name: `Bench Org ${suffix.slice(-6)}`,
    slug: `bench-${suffix}`.slice(0, 48),
  });
  if (org.error || !org.data?.id) {
    throw new Error(`Org create failed: ${JSON.stringify(org.error)}`);
  }

  const key = await authClient.apiKey.create({
    name: "Bench Key",
    environment: "dev",
    organizationId: org.data.id,
    scopes: ["*"],
  });
  if (key.error || !key.data?.key) {
    throw new Error(`API key create failed: ${JSON.stringify(key.error)}`);
  }

  return {
    apiKey: key.data.key,
    orgId: org.data.id,
    userId: signup.data.user.id,
  };
}

async function cleanup(orgId: string, userId: string) {
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
}

// --- Benchmarks ---

async function run() {
  console.log("\nVon API Benchmark\n");
  console.log("Setting up test resources...");

  const { apiKey, orgId, userId } = await setupTestResources();
  const headers = {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  };

  const request = (method: string, path: string, body?: unknown) =>
    app.handle(
      new Request(`${API_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })
    );

  console.log("Running benchmarks...\n");

  const results: Stats[] = [];
  let endpointId: string | null = null;

  // --- Health checks ---
  results.push(
    await bench("GET / (root)", 500, async () => {
      await app.handle(new Request(`${API_URL}/`));
    })
  );

  results.push(
    await bench("GET /live (health)", 500, async () => {
      await app.handle(new Request(`${API_URL}/live`));
    })
  );

  // --- Endpoint CRUD ---
  results.push(
    await bench("POST /endpoints (create)", 100, async () => {
      const res = await request("POST", "/endpoints", {
        url: "https://httpbin.org/post",
      });
      if (res.status === 201) {
        const data = (await res.json()) as { id: string };
        endpointId = data.id;
      }
    })
  );

  results.push(
    await bench("GET /endpoints (list)", 200, async () => {
      await request("GET", "/endpoints");
    })
  );

  if (endpointId) {
    results.push(
      await bench("GET /endpoints/:id (read)", 200, async () => {
        await request("GET", `/endpoints/${endpointId}`);
      })
    );
  }

  // --- Webhook events ---
  results.push(
    await bench("POST /webhooks (send event)", 200, async () => {
      await request("POST", "/webhooks", {
        eventType: "bench.test",
        payload: { ts: Date.now(), data: "benchmark" },
      });
    })
  );

  results.push(
    await bench("POST /webhooks/batch (10 events)", 50, async () => {
      await request("POST", "/webhooks/batch", {
        events: Array.from({ length: 10 }, (_, i) => ({
          eventType: "bench.batch",
          payload: { index: i, ts: Date.now() },
        })),
      });
    })
  );

  results.push(
    await bench("GET /webhooks/events (list)", 200, async () => {
      await request("GET", "/webhooks/events");
    })
  );

  results.push(
    await bench("GET /webhooks/events?eventTypes (filtered)", 200, async () => {
      await request(
        "GET",
        "/webhooks/events?eventTypes=bench.test&limit=10"
      );
    })
  );

  // --- Analytics ---
  results.push(
    await bench("GET /analytics/overview", 100, async () => {
      await request("GET", "/analytics/overview");
    })
  );

  results.push(
    await bench("GET /analytics/timeseries", 100, async () => {
      await request("GET", "/analytics/timeseries?interval=1h");
    })
  );

  // --- Concurrent load ---
  results.push(
    await benchConcurrent(
      "GET /webhooks/events (10 concurrent)",
      200,
      10,
      async () => {
        await request("GET", "/webhooks/events?limit=5");
      }
    )
  );

  results.push(
    await benchConcurrent(
      "POST /webhooks (10 concurrent)",
      100,
      10,
      async () => {
        await request("POST", "/webhooks", {
          eventType: "bench.concurrent",
          payload: { ts: Date.now() },
        });
      }
    )
  );

  // --- Print results ---
  console.log(
    `  ${"Operation".padEnd(35)} ${"Count".padStart(6)}     | ` +
      `${"p50".padStart(10)}    | ` +
      `${"p95".padStart(10)}    | ` +
      `${"p99".padStart(10)}    | ` +
      `${"Throughput".padStart(10)}`
  );
  console.log(`  ${"-".repeat(110)}`);

  for (const stat of results) {
    printStats(stat);
  }

  console.log("\nCleaning up...");
  await cleanup(orgId, userId);
  console.log("Done.\n");

  process.exit(0);
}

run().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
