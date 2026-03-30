type BenchResult = {
  name: string;
  opsPerSec: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
};

const fmt = (n: number): string => {
  if (n >= 1_000_000) { return `${(n / 1_000_000).toFixed(1)}M`; }
  if (n >= 1000) { return `${(n / 1000).toFixed(1)}K`; }
  return n.toFixed(0);
};

const fmtTime = (ms: number): string => {
  if (ms < 0.001) { return `${(ms * 1_000_000).toFixed(0)}ns`; }
  if (ms < 1) { return `${(ms * 1000).toFixed(1)}us`; }
  return `${ms.toFixed(2)}ms`;
};

function computeStats(name: string, durations: number[]): BenchResult {
  const sorted = [...durations].sort((a, b) => a - b);
  const total = sorted.reduce((a, b) => a + b, 0);
  const avg = total / sorted.length;
  return {
    name,
    opsPerSec: Math.round(sorted.length / (total / 1000)),
    avgMs: avg,
    p50Ms: sorted[Math.floor(sorted.length * 0.5)],
    p95Ms: sorted[Math.floor(sorted.length * 0.95)],
  };
}

export async function bench(
  name: string,
  fn: () => Promise<void> | void,
  iterations = 50
): Promise<BenchResult> {
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

export async function benchConcurrent(
  name: string,
  fn: () => Promise<void>,
  iterations = 50,
  concurrency = 10
): Promise<BenchResult> {
  for (let i = 0; i < 5; i++) {
    await fn();
  }

  const durations: number[] = [];
  const batches = Math.ceil(iterations / concurrency);
  for (let b = 0; b < batches; b++) {
    const size = Math.min(concurrency, iterations - b * concurrency);
    const results = await Promise.all(
      Array.from({ length: size }, async () => {
        const start = performance.now();
        await fn();
        return performance.now() - start;
      })
    );
    durations.push(...results);
  }

  return computeStats(name, durations);
}

export function printResults(title: string, results: BenchResult[]) {
  console.log(`\n  ${title}`);
  console.log(`  ${"─".repeat(76)}`);
  for (const r of results) {
    const ops = fmt(r.opsPerSec).padStart(8);
    const p50 = fmtTime(r.p50Ms).padStart(8);
    const p95 = fmtTime(r.p95Ms).padStart(8);
    console.log(`  ${ops} ops/s  p50 ${p50}  p95 ${p95}  ${r.name}`);
  }
}

export function printSummary(allResults: BenchResult[]) {
  const fastest = allResults.reduce((a, b) =>
    a.opsPerSec > b.opsPerSec ? a : b
  );
  const slowest = allResults.reduce((a, b) =>
    a.opsPerSec < b.opsPerSec ? a : b
  );
  console.log("\n  Summary");
  console.log(`  ${"─".repeat(76)}`);
  console.log(`  Fastest: ${fastest.name} (${fmt(fastest.opsPerSec)} ops/s)`);
  console.log(`  Slowest: ${slowest.name} (${fmt(slowest.opsPerSec)} ops/s)`);
  console.log(`  Ratio:   ${(fastest.opsPerSec / slowest.opsPerSec).toFixed(1)}x\n`);
}
