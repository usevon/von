import { secrets } from "bun"

const BASE_URL = "http://localhost"

export type BenchmarkResult = {
  name: string
  totalRequests: number
  successCount: number
  failureCount: number
  durationMs: number
  requestsPerSecond: number
  latencies: number[]
  p50: number
  p95: number
  p99: number
  minLatency: number
  maxLatency: number
  avgLatency: number
}

export type BenchmarkConfig = {
  requests: number
  concurrency: number
}

export const validateApiKey = async (key: string, port: number): Promise<boolean> => {
  try {
    const response = await fetch(`http://localhost:${port}/endpoints`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    return response.status !== 401
  } catch {
    return false
  }
}

const promptUntilValid = async (port: number) => {
  while (true) {
    const key = prompt("Enter your VON_API_KEY (or press Enter to skip):")?.trim()
    if (!key) return null

    const valid = await validateApiKey(key, port)
    if (valid) {
      await secrets.set({ service: "von", name: "VON_API_KEY", value: key })
      console.log("Saved to OS keychain\n")
      return key
    }
    console.log("Invalid API key, try again")
  }
}

export const getApiKey = async (port: number): Promise<string | null> => {
  if (process.env.VON_API_KEY) {
    const valid = await validateApiKey(process.env.VON_API_KEY, port)
    if (valid) return process.env.VON_API_KEY
  }

  const saved = await secrets.get({ service: "von", name: "VON_API_KEY" })
  if (saved) {
    const valid = await validateApiKey(saved, port)
    if (valid) return saved
    await secrets.delete({ service: "von", name: "VON_API_KEY" })
  }

  console.log("\nNo valid API key found for benchmarks")
  return promptUntilValid(port)
}

const percentile = (arr: number[], p: number): number => {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]!
}

export const calculateStats = (
  name: string,
  latencies: number[],
  successCount: number,
  failureCount: number,
  durationMs: number
): BenchmarkResult => {
  const totalRequests = successCount + failureCount
  return {
    name,
    totalRequests,
    successCount,
    failureCount,
    durationMs,
    requestsPerSecond: totalRequests / (durationMs / 1000),
    latencies,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    minLatency: latencies.length > 0 ? Math.min(...latencies) : 0,
    maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
    avgLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
  }
}

export const printResult = (result: BenchmarkResult) => {
  const hobbyLimit = 25
  const comparison = result.requestsPerSecond / hobbyLimit

  console.log(`
┌─────────────────────────────────────────────────────────────┐
│ ${result.name.padEnd(59)} │
├─────────────────────────────────────────────────────────────┤
│ Throughput                                                  │
│   Requests/sec:    ${result.requestsPerSecond.toFixed(2).padStart(10)}                            │
│   vs Hobby (25/s): ${(comparison * 100).toFixed(0).padStart(10)}%                          │
├─────────────────────────────────────────────────────────────┤
│ Latency (ms)                                                │
│   Min:             ${result.minLatency.toFixed(2).padStart(10)}                            │
│   Avg:             ${result.avgLatency.toFixed(2).padStart(10)}                            │
│   p50:             ${result.p50.toFixed(2).padStart(10)}                            │
│   p95:             ${result.p95.toFixed(2).padStart(10)}                            │
│   p99:             ${result.p99.toFixed(2).padStart(10)}                            │
│   Max:             ${result.maxLatency.toFixed(2).padStart(10)}                            │
├─────────────────────────────────────────────────────────────┤
│ Summary                                                     │
│   Total:           ${result.totalRequests.toString().padStart(10)}                            │
│   Success:         ${result.successCount.toString().padStart(10)}                            │
│   Failed:          ${result.failureCount.toString().padStart(10)}                            │
│   Duration:        ${(result.durationMs / 1000).toFixed(2).padStart(10)}s                           │
└─────────────────────────────────────────────────────────────┘
`)
}

export const runConcurrent = async <T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> => {
  const results: T[] = []
  let index = 0

  const runNext = async (): Promise<void> => {
    while (index < tasks.length) {
      const currentIndex = index++
      const result = await tasks[currentIndex]!()
      results[currentIndex] = result
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => runNext())
  await Promise.all(workers)

  return results
}
