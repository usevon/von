/**
 * Worker Delivery Benchmark (Self-Contained)
 *
 * Measures how fast the Von worker can deliver webhooks to endpoints.
 * This tests the delivery path: Worker picks job, sends HTTP request, updates status.
 *
 * Fully self-contained:
 * 1. Starts API server on port 8001
 * 2. Starts echo server on port 8002
 * 3. Creates an inline webhook worker
 * 4. Runs benchmarks
 * 5. Cleans up everything
 *
 * Run: bun run benchmark:worker
 */
import { Elysia } from "elysia"
import { Worker, Job } from "bullmq"
import { eq } from "drizzle-orm"
import { createHmac } from "crypto"
import { db } from "@von/db"
import { delivery, event, endpoint } from "@von/db/schema"
import { createConnection, type WebhookDeliveryJob } from "@von/queue"
import { app } from "../../src/app"
import { getApiKey } from "./setup"

const API_PORT = 8001
const ECHO_PORT = 8002

type DeliveryStats = {
  received: number
  timestamps: number[]
}

// Inline worker creation (same logic as apps/worker but without env import)
const createBenchmarkWorker = (concurrency: number = 10) => {
  const generateSignature = (payload: string, secret: string): string => {
    const hmac = createHmac("sha256", secret)
    hmac.update(payload)
    return hmac.digest("hex")
  }

  const processWebhookDelivery = async (job: Job<WebhookDeliveryJob>) => {
    const { deliveryId, eventId, endpointId } = job.data

    const [deliveryRecord] = await db
      .select()
      .from(delivery)
      .where(eq(delivery.id, deliveryId))
      .limit(1)

    if (!deliveryRecord || deliveryRecord.status === "delivered") return

    const [eventRecord] = await db
      .select()
      .from(event)
      .where(eq(event.id, eventId))
      .limit(1)

    if (!eventRecord) return

    const [endpointRecord] = await db
      .select()
      .from(endpoint)
      .where(eq(endpoint.id, endpointId))
      .limit(1)

    if (!endpointRecord || !endpointRecord.enabled) return

    const payload = eventRecord.payload
    const signature = generateSignature(payload, endpointRecord.secret)
    const now = new Date()

    try {
      const response = await fetch(endpointRecord.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Von-Signature": signature,
          "X-Von-Event-Type": eventRecord.eventType,
          "X-Von-Delivery-Id": deliveryId,
          "X-Von-Event-Id": eventId,
        },
        body: payload,
        signal: AbortSignal.timeout(endpointRecord.timeoutMs),
      })

      if (response.ok) {
        await db
          .update(delivery)
          .set({
            status: "delivered",
            attempts: deliveryRecord.attempts + 1,
            lastAttemptAt: now,
            responseStatus: response.status,
            updatedAt: now,
          })
          .where(eq(delivery.id, deliveryId))
      }
    } catch {
      // Simplified error handling for benchmark
    }
  }

  return new Worker<WebhookDeliveryJob>("webhook-delivery", processWebhookDelivery, {
    connection: createConnection(),
    concurrency,
  })
}

const createEchoServer = (stats: DeliveryStats) => {
  return new Elysia({ name: "echo-server" })
    .post("/webhook", () => {
      stats.received++
      stats.timestamps.push(performance.now())
      return { ok: true }
    })
    .get("/stats", () => ({
      received: stats.received,
    }))
    .post("/reset", () => {
      stats.received = 0
      stats.timestamps = []
      return { ok: true }
    })
}

const waitForDeliveries = async (
  echoUrl: string,
  expectedCount: number,
  timeoutMs: number = 60000
): Promise<{ received: number; durationMs: number }> => {
  const startTime = performance.now()
  const pollInterval = 50

  while (performance.now() - startTime < timeoutMs) {
    const response = await fetch(`${echoUrl}/stats`)
    const stats = (await response.json()) as { received: number }

    if (stats.received >= expectedCount) {
      return { received: stats.received, durationMs: performance.now() - startTime }
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval))
  }

  const finalResponse = await fetch(`${echoUrl}/stats`)
  const finalStats = (await finalResponse.json()) as { received: number }
  return { received: finalStats.received, durationMs: timeoutMs }
}

const createTestEndpoint = async (apiUrl: string, apiKey: string, webhookUrl: string): Promise<string | null> => {
  const response = await fetch(`${apiUrl}/endpoints`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url: webhookUrl,
      description: "Benchmark echo endpoint",
    }),
  })

  if (!response.ok) {
    console.error("Failed to create endpoint:", await response.text())
    return null
  }

  const data = (await response.json()) as { id: string }
  return data.id
}

const deleteEndpoint = async (apiUrl: string, apiKey: string, endpointId: string) => {
  await fetch(`${apiUrl}/endpoints/${endpointId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  })
}

const queueWebhooks = async (
  apiUrl: string,
  apiKey: string,
  count: number,
  endpointId: string
): Promise<number> => {
  let queued = 0

  // Queue in parallel for speed
  const batchSize = 50
  for (let i = 0; i < count; i += batchSize) {
    const batch = Array.from({ length: Math.min(batchSize, count - i) }, (_, j) =>
      fetch(`${apiUrl}/webhooks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          eventType: "benchmark.delivery",
          payload: { index: i + j, timestamp: Date.now() },
          endpointIds: [endpointId],
        }),
      }).then((r) => (r.status === 201 ? 1 : 0))
    )

    const results = await Promise.all(batch)
    queued += results.reduce((a, b) => a + b, 0)
  }

  return queued
}

const runBenchmark = async (
  apiUrl: string,
  echoUrl: string,
  apiKey: string,
  endpointId: string,
  config: { webhooks: number; name: string }
) => {
  // Reset echo server stats
  await fetch(`${echoUrl}/reset`, { method: "POST" })

  console.log(`  Queuing ${config.webhooks} webhooks...`)
  const queueStart = performance.now()
  const queued = await queueWebhooks(apiUrl, apiKey, config.webhooks, endpointId)
  const queueDuration = performance.now() - queueStart
  console.log(`  Queued ${queued} in ${(queueDuration / 1000).toFixed(2)}s`)

  console.log(`  Waiting for deliveries...`)
  const result = await waitForDeliveries(echoUrl, queued, 120000)

  const deliveriesPerSecond = result.received / (result.durationMs / 1000)

  return {
    name: config.name,
    queued,
    delivered: result.received,
    queueDurationMs: queueDuration,
    deliveryDurationMs: result.durationMs,
    deliveriesPerSecond,
  }
}

const main = async () => {
  console.log("\nVon Worker Delivery Benchmark\n")

  const apiUrl = `http://localhost:${API_PORT}`
  const echoUrl = `http://localhost:${ECHO_PORT}`

  // Start API server
  console.log("Starting API server...")
  const apiServer = app.listen(API_PORT)
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Verify API is running
  try {
    const health = await fetch(`${apiUrl}/live`)
    if (!health.ok) throw new Error("API not responding")
    console.log("API server ready at", apiUrl)
  } catch (error) {
    console.error("Failed to start API server:", error)
    apiServer.stop()
    process.exit(1)
  }

  // Get API key
  const apiKey = await getApiKey(API_PORT)
  if (!apiKey) {
    console.error("\nNo API key available. Skipping benchmark.")
    apiServer.stop()
    process.exit(1)
  }

  // Start echo server
  console.log("Starting echo server...")
  const stats: DeliveryStats = { received: 0, timestamps: [] }
  const echoServer = createEchoServer(stats).listen(ECHO_PORT)
  console.log("Echo server ready at", echoUrl)

  // Create test endpoint
  console.log("Creating test endpoint...")
  const endpointId = await createTestEndpoint(apiUrl, apiKey, `${echoUrl}/webhook`)
  if (!endpointId) {
    echoServer.stop()
    apiServer.stop()
    process.exit(1)
  }
  console.log("Test endpoint created:", endpointId)

  // Start worker with different concurrency levels
  console.log("\nRunning benchmarks...\n")

  const concurrencyLevels = [5, 10, 20]
  const allResults = []

  for (const concurrency of concurrencyLevels) {
    console.log(`\n--- Worker concurrency: ${concurrency} ---`)

    // Create worker with this concurrency
    const worker = createBenchmarkWorker(concurrency)
    await new Promise((resolve) => setTimeout(resolve, 200)) // Let worker connect

    const configs = [
      { webhooks: 100, name: `n=100, c=${concurrency}` },
      { webhooks: 250, name: `n=250, c=${concurrency}` },
    ]

    for (const config of configs) {
      console.log(`\nRunning: ${config.name}`)
      const result = await runBenchmark(apiUrl, echoUrl, apiKey, endpointId, config)
      allResults.push({ ...result, concurrency })

      console.log(`  Delivered: ${result.delivered}/${result.queued}`)
      console.log(`  Throughput: ${result.deliveriesPerSecond.toFixed(1)} deliveries/sec`)
    }

    // Close worker before next concurrency test
    await worker.close()
  }

  // Summary
  console.log("\n\nSummary\n")
  console.log("+--------------------------+-------------+-----------+-----------------+")
  console.log("| Benchmark                |   Queued    | Delivered | Deliveries/sec  |")
  console.log("+--------------------------+-------------+-----------+-----------------+")
  for (const r of allResults) {
    console.log(
      `| ${r.name.padEnd(24)} | ${r.queued.toString().padStart(11)} | ${r.delivered.toString().padStart(9)} | ${r.deliveriesPerSecond.toFixed(1).padStart(15)} |`
    )
  }
  console.log("+--------------------------+-------------+-----------+-----------------+")

  // Best result
  const bestResult = allResults.reduce((a, b) => (a.deliveriesPerSecond > b.deliveriesPerSecond ? a : b))
  const hobbyLimit = 25

  console.log(`\nBest throughput: ${bestResult.deliveriesPerSecond.toFixed(1)} deliveries/sec`)
  console.log(`   Hobby tier limit: ${hobbyLimit}/sec`)
  console.log(`   Headroom: ${(bestResult.deliveriesPerSecond / hobbyLimit).toFixed(1)}x`)

  // Cleanup
  console.log("\nCleaning up...")
  await deleteEndpoint(apiUrl, apiKey, endpointId)
  echoServer.stop()
  apiServer.stop()

  console.log("Benchmark complete.\n")
}

main().catch((error) => {
  console.error("Benchmark failed:", error)
  process.exit(1)
})
