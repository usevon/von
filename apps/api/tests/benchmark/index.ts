/**
 * Von Benchmark Suite
 *
 * Measures each layer to identify bottlenecks.
 *
 * Run: bun run benchmark
 */
import { Elysia } from "elysia"
import { Worker, Job } from "bullmq"
import { eq } from "drizzle-orm"
import { createHmac } from "crypto"
import { db } from "@von/db"
import { delivery, event, endpoint } from "@von/db/schema"
import { createConnection, getWebhookDeliveryQueue, type WebhookDeliveryJob } from "@von/queue"
import { app } from "../../src/app"
import { getApiKey } from "./setup"

const PORT = 8001
const ECHO_PORT = 8002

// Utilities

type BenchResult = {
  name: string
  requests: number
  durationMs: number
  rps: number
  avgLatencyMs: number
  p50: number
  p99: number
  failures: number
}

const percentile = (arr: number[], p: number): number => {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]!
}

const runLoad = async (
  name: string,
  requests: number,
  concurrency: number,
  fn: () => Promise<boolean>
): Promise<BenchResult> => {
  const latencies: number[] = []
  let failures = 0
  let completed = 0

  const startTime = performance.now()

  const worker = async () => {
    while (completed < requests) {
      const idx = completed++
      if (idx >= requests) break

      const t0 = performance.now()
      try {
        const ok = await fn()
        if (!ok) failures++
      } catch {
        failures++
      }
      latencies.push(performance.now() - t0)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  const durationMs = performance.now() - startTime

  return {
    name,
    requests,
    durationMs,
    rps: requests / (durationMs / 1000),
    avgLatencyMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p50: percentile(latencies, 50),
    p99: percentile(latencies, 99),
    failures,
  }
}

const printResults = (results: BenchResult[]) => {
  console.log("\n+------------------------------+----------+----------+----------+----------+----------+")
  console.log("| Test                         |  Req/sec |  Avg(ms) |  p50(ms) |  p99(ms) | Failures |")
  console.log("+------------------------------+----------+----------+----------+----------+----------+")
  for (const r of results) {
    console.log(
      `| ${r.name.padEnd(28)} | ${r.rps.toFixed(0).padStart(8)} | ${r.avgLatencyMs.toFixed(1).padStart(8)} | ${r.p50.toFixed(1).padStart(8)} | ${r.p99.toFixed(1).padStart(8)} | ${r.failures.toString().padStart(8)} |`
    )
  }
  console.log("+------------------------------+----------+----------+----------+----------+----------+")
}

// Inline worker for end-to-end test

const createBenchmarkWorker = (concurrency: number = 20) => {
  const generateSignature = (payload: string, secret: string): string => {
    const hmac = createHmac("sha256", secret)
    hmac.update(payload)
    return hmac.digest("hex")
  }

  const processJob = async (job: Job<WebhookDeliveryJob>) => {
    const { deliveryId, eventId, endpointId } = job.data

    const [deliveryRecord] = await db.select().from(delivery).where(eq(delivery.id, deliveryId)).limit(1)
    if (!deliveryRecord || deliveryRecord.status === "delivered") return

    const [eventRecord] = await db.select().from(event).where(eq(event.id, eventId)).limit(1)
    if (!eventRecord) return

    const [endpointRecord] = await db.select().from(endpoint).where(eq(endpoint.id, endpointId)).limit(1)
    if (!endpointRecord || !endpointRecord.enabled) return

    const payload = eventRecord.payload
    const signature = generateSignature(payload, endpointRecord.secret)

    try {
      const response = await fetch(endpointRecord.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Von-Signature": signature,
        },
        body: payload,
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        await db.update(delivery).set({ status: "delivered", updatedAt: new Date() }).where(eq(delivery.id, deliveryId))
      }
    } catch {}
  }

  return new Worker<WebhookDeliveryJob>("webhook-delivery", processJob, {
    connection: createConnection(),
    concurrency,
  })
}

// Main

const main = async () => {
  console.log("\n========================================")
  console.log("  Von Benchmark Suite")
  console.log("========================================\n")

  const REQUESTS = 500
  const CONCURRENCY = 50

  // Start main API
  console.log("Starting API server...")
  const apiServer = app.listen(PORT)
  const apiUrl = `http://localhost:${PORT}`
  await new Promise((r) => setTimeout(r, 300))

  // Create minimal echo app for raw baseline
  const echoApp = new Elysia()
    .post("/echo", () => ({ ok: true }))
    .post("/webhook", () => ({ ok: true }))
    .listen(ECHO_PORT)
  const echoUrl = `http://localhost:${ECHO_PORT}`

  // Get API key
  const apiKey = await getApiKey(PORT)
  if (!apiKey) {
    console.error("No API key available")
    apiServer.stop()
    echoApp.stop()
    process.exit(1)
  }

  const results: BenchResult[] = []

  // Test 1: Raw Elysia baseline (no auth, no DB)
  console.log("\n[1/5] Raw Elysia (echo endpoint, no auth)...")
  results.push(
    await runLoad("1. Raw Elysia", REQUESTS, CONCURRENCY, async () => {
      const res = await fetch(`${echoUrl}/echo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      })
      return res.ok
    })
  )

  // Test 2: Health check (minimal Elysia route in real app)
  console.log("[2/5] Health check (/live, no auth)...")
  results.push(
    await runLoad("2. Health /live", REQUESTS, CONCURRENCY, async () => {
      const res = await fetch(`${apiUrl}/live`)
      return res.ok
    })
  )

  // Test 3: Auth validation (GET /endpoints)
  console.log("[3/5] Auth validation (GET /endpoints)...")
  results.push(
    await runLoad("3. Auth + DB read", REQUESTS, CONCURRENCY, async () => {
      const res = await fetch(`${apiUrl}/endpoints`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      return res.ok
    })
  )

  // Test 4: Full webhook ingestion (auth + DB write + queue)
  console.log("[4/5] Full ingestion (POST /webhooks)...")

  // First create an endpoint to receive webhooks
  const epRes = await fetch(`${apiUrl}/endpoints`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ url: `${echoUrl}/webhook`, description: "bench" }),
  })
  const epData = (await epRes.json()) as { id: string }
  const endpointId = epData.id

  let webhookCounter = 0
  results.push(
    await runLoad("4. Full ingestion", REQUESTS, CONCURRENCY, async () => {
      const idx = webhookCounter++
      const res = await fetch(`${apiUrl}/webhooks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          eventType: "bench.test",
          payload: { i: idx },
          endpointIds: [endpointId],
        }),
      })
      return res.status === 201
    })
  )

  // Test 5: End-to-end with worker delivery
  console.log("[5/5] End-to-end (ingestion + worker delivery)...")

  // Track deliveries received
  let deliveriesReceived = 0
  const trackingApp = new Elysia()
    .post("/track", () => {
      deliveriesReceived++
      return { ok: true }
    })
    .listen(ECHO_PORT + 1)
  const trackUrl = `http://localhost:${ECHO_PORT + 1}`

  // Create endpoint pointing to tracking server
  const ep2Res = await fetch(`${apiUrl}/endpoints`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ url: `${trackUrl}/track`, description: "e2e" }),
  })
  const ep2Data = (await ep2Res.json()) as { id: string }
  const e2eEndpointId = ep2Data.id

  // Start worker
  const worker = createBenchmarkWorker(20)
  await new Promise((r) => setTimeout(r, 200))

  const E2E_REQUESTS = 200
  let e2eCounter = 0
  const e2eStart = performance.now()

  // Queue all webhooks
  await Promise.all(
    Array.from({ length: E2E_REQUESTS }, async (_, i) => {
      await fetch(`${apiUrl}/webhooks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          eventType: "e2e.test",
          payload: { i },
          endpointIds: [e2eEndpointId],
        }),
      })
    })
  )

  // Wait for deliveries
  const timeout = 30000
  const pollStart = performance.now()
  while (deliveriesReceived < E2E_REQUESTS && performance.now() - pollStart < timeout) {
    await new Promise((r) => setTimeout(r, 50))
  }

  const e2eDuration = performance.now() - e2eStart

  results.push({
    name: "5. End-to-end",
    requests: E2E_REQUESTS,
    durationMs: e2eDuration,
    rps: deliveriesReceived / (e2eDuration / 1000),
    avgLatencyMs: e2eDuration / deliveriesReceived,
    p50: 0,
    p99: 0,
    failures: E2E_REQUESTS - deliveriesReceived,
  })

  await worker.close()
  trackingApp.stop()

  // Results
  printResults(results)

  // Analysis
  console.log("\nAnalysis:")
  const rawRps = results[0]!.rps
  const healthRps = results[1]!.rps
  const authRps = results[2]!.rps
  const fullRps = results[3]!.rps

  console.log(`  Raw Elysia baseline:     ${rawRps.toFixed(0)} req/sec`)
  console.log(`  App overhead (vs raw):   ${((1 - healthRps / rawRps) * 100).toFixed(1)}%`)
  console.log(`  Auth overhead (vs raw):  ${((1 - authRps / rawRps) * 100).toFixed(1)}%`)
  console.log(`  Full ingestion (vs raw): ${((1 - fullRps / rawRps) * 100).toFixed(1)}%`)

  console.log(`\n  Hobby tier (25/sec):     ${(fullRps / 25).toFixed(1)}x headroom`)
  console.log(`  Pro tier (100/sec):      ${(fullRps / 100).toFixed(1)}x headroom`)

  // Cleanup
  await fetch(`${apiUrl}/endpoints/${endpointId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  await fetch(`${apiUrl}/endpoints/${e2eEndpointId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  echoApp.stop()
  apiServer.stop()

  console.log("\nBenchmark complete.\n")
}

main().catch((err) => {
  console.error("Benchmark failed:", err)
  process.exit(1)
})
