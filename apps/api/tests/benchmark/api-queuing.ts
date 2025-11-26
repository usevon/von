/**
 * API Queuing Benchmark
 *
 * Measures how fast the Von API can accept webhook events (queuing speed).
 * This tests the ingestion path: API receives event, validates, queues to Redis.
 *
 * Run: bun run benchmark:api
 */
import { app } from "../../src/app"
import { getApiKey, calculateStats, printResult, runConcurrent, validateApiKey } from "./setup"

const BENCHMARK_PORT = 8001

type LatencyResult = {
  success: boolean
  latencyMs: number
  status?: number
}

const runBenchmark = async (
  baseUrl: string,
  apiKey: string,
  config: { requests: number; concurrency: number; name: string }
) => {
  const latencies: number[] = []
  let successCount = 0
  let failureCount = 0

  const tasks = Array.from({ length: config.requests }, (_, i) => async (): Promise<LatencyResult> => {
    const start = performance.now()
    try {
      const response = await fetch(`${baseUrl}/webhooks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          eventType: "benchmark.test",
          payload: { index: i, timestamp: Date.now() },
          idempotencyKey: `bench-${Date.now()}-${i}`,
        }),
      })
      const latencyMs = performance.now() - start
      return { success: response.status === 201, latencyMs, status: response.status }
    } catch (error) {
      const latencyMs = performance.now() - start
      return { success: false, latencyMs }
    }
  })

  const startTime = performance.now()
  const results = await runConcurrent(tasks, config.concurrency)
  const durationMs = performance.now() - startTime

  for (const result of results) {
    if (result.success) {
      successCount++
      latencies.push(result.latencyMs)
    } else {
      failureCount++
    }
  }

  return calculateStats(config.name, latencies, successCount, failureCount, durationMs)
}

const main = async () => {
  console.log("\nVon API Queuing Benchmark\n")
  console.log("Starting API server...")

  const server = app.listen(BENCHMARK_PORT)
  const baseUrl = `http://localhost:${BENCHMARK_PORT}`

  // Wait for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Verify server is running
  try {
    const health = await fetch(`${baseUrl}/live`)
    if (!health.ok) throw new Error("Server not ready")
    console.log("Server ready at", baseUrl)
  } catch (error) {
    console.error("Failed to start server:", error)
    server.stop()
    process.exit(1)
  }

  // Get API key
  const apiKey = await getApiKey(BENCHMARK_PORT)
  if (!apiKey) {
    console.error("\nNo API key available. Skipping benchmark.")
    server.stop()
    process.exit(1)
  }

  console.log("\nWarming up...")
  await runBenchmark(baseUrl, apiKey, { requests: 10, concurrency: 5, name: "Warmup" })

  console.log("Running benchmarks...\n")

  // Different concurrency levels
  const configs = [
    { requests: 100, concurrency: 1, name: "Sequential (c=1, n=100)" },
    { requests: 100, concurrency: 10, name: "Low concurrency (c=10, n=100)" },
    { requests: 500, concurrency: 50, name: "Medium concurrency (c=50, n=500)" },
    { requests: 1000, concurrency: 100, name: "High concurrency (c=100, n=1000)" },
  ]

  const results = []

  for (const config of configs) {
    console.log(`Running: ${config.name}...`)
    const result = await runBenchmark(baseUrl, apiKey, config)
    results.push(result)
    printResult(result)
  }

  // Summary table
  console.log("\nSummary\n")
  console.log("┌────────────────────────────────────────┬─────────────┬─────────────┬─────────────┐")
  console.log("│ Benchmark                              │   Req/sec   │   p50 (ms)  │   p99 (ms)  │")
  console.log("├────────────────────────────────────────┼─────────────┼─────────────┼─────────────┤")
  for (const r of results) {
    console.log(
      `│ ${r.name.padEnd(38)} │ ${r.requestsPerSecond.toFixed(0).padStart(11)} │ ${r.p50.toFixed(1).padStart(11)} │ ${r.p99.toFixed(1).padStart(11)} │`
    )
  }
  console.log("└────────────────────────────────────────┴─────────────┴─────────────┴─────────────┘")

  // Hobby tier comparison
  const bestResult = results.reduce((a, b) => (a.requestsPerSecond > b.requestsPerSecond ? a : b))
  const hobbyLimit = 25
  const headroom = bestResult.requestsPerSecond / hobbyLimit

  console.log(`\nBest throughput: ${bestResult.requestsPerSecond.toFixed(0)} req/sec`)
  console.log(`   Hobby tier limit: ${hobbyLimit} req/sec`)
  console.log(`   Headroom: ${headroom.toFixed(1)}x (${headroom >= 1 ? "sufficient" : "insufficient"})`)

  server.stop()
  console.log("\nBenchmark complete.\n")
}

main().catch((error) => {
  console.error("Benchmark failed:", error)
  process.exit(1)
})
