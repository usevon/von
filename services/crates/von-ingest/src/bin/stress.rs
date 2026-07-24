use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Instant;

const LEVELS: &[usize] = &[10, 50, 100, 200, 500, 1000];

/// Ramp payloads with a request-budget divisor so large sizes finish in minutes.
const MATRIX: &[(&str, usize, usize)] = &[
    ("8B", 0, 1),
    ("1KB", 1024, 1),
    ("16KB", 16 * 1024, 3),
    ("64KB", 64 * 1024, 8),
    ("256KB", 256 * 1024, 16),
    ("1MB", MAX_PAYLOAD_PROBE, 32),
];

/// Spans a tiny ping through the 1MB payload cap, sized just under the limit so
/// the JSON wrapper does not tip the body over it.
const MAX_PAYLOAD_PROBE: usize = 1024 * 1024 - 256;

fn payload_of(bytes: usize) -> serde_json::Value {
    if bytes == 0 {
        return serde_json::json!({ "ts": 1 });
    }
    serde_json::json!({
        "id": "evt_stress",
        "ts": 1,
        "data": "x".repeat(bytes)
    })
}

#[derive(Clone, Copy)]
struct Run {
    concurrency: usize,
    req_per_sec: f64,
    p50: f64,
    p95: f64,
    p99: f64,
    redis_calls: u64,
    failures: usize,
    last_status: u16,
    connect_errors: usize,
}

async fn evalsha_count(redis: &str) -> u64 {
    let client = match redis::Client::open(redis) {
        Ok(c) => c,
        Err(_) => return 0,
    };
    let mut conn = match client.get_multiplexed_async_connection().await {
        Ok(c) => c,
        Err(_) => return 0,
    };
    let info: String = redis::cmd("INFO")
        .arg("commandstats")
        .query_async(&mut conn)
        .await
        .unwrap_or_default();
    info.lines()
        .find(|l| l.starts_with("cmdstat_evalsha:"))
        .and_then(|l| l.split("calls=").nth(1))
        .and_then(|s| s.split(',').next())
        .and_then(|s| s.parse().ok())
        .unwrap_or(0)
}

async fn reset_stats(redis: &str) {
    if let Ok(client) = redis::Client::open(redis)
        && let Ok(mut conn) = client.get_multiplexed_async_connection().await
    {
        let _: Result<(), _> = redis::cmd("CONFIG")
            .arg("RESETSTAT")
            .query_async(&mut conn)
            .await;
    }
}

async fn run_level(
    client: &reqwest::Client,
    url: &str,
    key: &str,
    total: usize,
    concurrency: usize,
    payload_bytes: usize,
) -> (Vec<f64>, usize, u16, usize, f64) {
    let body = serde_json::json!({
        "eventType": "sweep.test",
        "payload": payload_of(payload_bytes)
    });

    // A worker pool keeps exactly `concurrency` requests in flight, a per-round barrier
    // would bind measured throughput to the slowest request of every round.
    let counter = Arc::new(AtomicUsize::new(0));
    let started = Instant::now();
    let mut handles = Vec::with_capacity(concurrency);
    for _ in 0..concurrency {
        let client = client.clone();
        let url = url.to_owned();
        let key = key.to_owned();
        let body = body.clone();
        let counter = counter.clone();
        handles.push(tokio::spawn(async move {
            let mut durations = Vec::new();
            let mut failures = 0usize;
            let mut last_status = 0u16;
            let mut connect_errors = 0usize;
            loop {
                let idx = counter.fetch_add(1, Ordering::Relaxed);
                if idx >= total {
                    break;
                }
                let t0 = Instant::now();
                let res = client
                    .post(&url)
                    .bearer_auth(&key)
                    .header(
                        "x-forwarded-for",
                        format!("10.90.{}.{}", idx / 256 % 256, idx % 256),
                    )
                    .json(&body)
                    .send()
                    .await;
                match res {
                    Ok(r) => {
                        let code = r.status().as_u16();
                        let _ = r.bytes().await;
                        if !(200..300).contains(&code) {
                            failures += 1;
                            last_status = code;
                        }
                    }
                    Err(_) => connect_errors += 1,
                }
                durations.push(t0.elapsed().as_secs_f64() * 1000.0);
            }
            (durations, failures, last_status, connect_errors)
        }));
    }

    let mut durations = Vec::with_capacity(total);
    let mut failures = 0usize;
    let mut last_status = 0u16;
    let mut connect_errors = 0usize;
    for h in handles {
        if let Ok((d, f, l, c)) = h.await {
            durations.extend(d);
            failures += f;
            if l != 0 {
                last_status = l;
            }
            connect_errors += c;
        }
    }

    (
        durations,
        failures,
        last_status,
        connect_errors,
        started.elapsed().as_secs_f64(),
    )
}

fn pct(sorted: &[f64], p: f64) -> f64 {
    if sorted.is_empty() {
        return 0.0;
    }
    let idx = ((sorted.len() as f64 * p) as usize).min(sorted.len() - 1);
    sorted[idx]
}

fn annotate(run: &Run, prev: Option<&Run>, requests: usize) -> String {
    if run.connect_errors > 0 {
        return format!(
            "client could not open {} connections, machine limit reached",
            run.connect_errors
        );
    }
    if run.failures > 0 {
        return format!(
            "{} requests rejected, last status {}",
            run.failures, run.last_status
        );
    }

    let coalescing = requests as f64 / run.redis_calls.max(1) as f64;
    let mut notes = vec![format!("{coalescing:.1}x coalescing")];

    match prev {
        None => notes.push("baseline".to_owned()),
        Some(p) => {
            let delta = (run.req_per_sec - p.req_per_sec) / p.req_per_sec * 100.0;
            if delta > 10.0 {
                notes.push(format!("scaling, +{delta:.0}% throughput"));
            } else if delta < -10.0 {
                notes.push(format!("degrading, {delta:.0}% throughput, knee passed"));
            } else {
                notes.push(format!("plateau, {delta:+.0}% throughput"));
            }
            let lat = run.p50 / p.p50;
            if lat > 2.0 {
                notes.push(format!("latency {lat:.1}x worse, queueing"));
            }
        }
    }

    if run.p99 > run.p50 * 5.0 && run.p50 > 0.0 {
        notes.push("wide tail".to_owned());
    }

    // Little's law, when p50 tracks clients over throughput the latency is queueing,
    // so only more MB/s can lower it, not per-request work.
    if run.req_per_sec > 0.0 {
        let queue_ms = run.concurrency as f64 / run.req_per_sec * 1000.0;
        if run.p50 >= queue_ms * 0.75 {
            notes.push("throughput bound".to_owned());
        }
    }

    notes.join(", ")
}

struct Cell {
    label: &'static str,
    concurrency: usize,
    run: Run,
}

fn median(values: &mut [f64]) -> f64 {
    values.sort_by(|a, b| a.partial_cmp(b).unwrap());
    values[values.len() / 2]
}

/// Ramps every payload size across the concurrency levels once, printing live rows.
async fn one_pass(
    client: &reqwest::Client,
    url: &str,
    key: &str,
    requests: usize,
    redis_url: &str,
) -> Vec<Cell> {
    let mut cells = Vec::new();

    for (label, bytes, divisor) in MATRIX {
        let total = (requests / divisor).max(200);
        println!("\nconcurrency ramp at {label} payload, {total} requests per level\n");
        println!(
            "{:>7}  {:>10}  {:>8}  {:>8}  {:>8}  {:>8}  {:>7}  notes",
            "clients", "req/s", "MB/s", "p50", "p95", "p99", "redis"
        );

        let mut prev: Option<Run> = None;
        for &concurrency in LEVELS {
            if concurrency > total {
                continue;
            }
            reset_stats(redis_url).await;

            let (mut durations, failures, last_status, connect_errors, wall) =
                run_level(client, url, key, total, concurrency, *bytes).await;
            let redis_calls = evalsha_count(redis_url).await;

            durations.sort_by(|a, b| a.partial_cmp(b).unwrap());
            let run = Run {
                concurrency,
                req_per_sec: durations.len() as f64 / wall,
                p50: pct(&durations, 0.50),
                p95: pct(&durations, 0.95),
                p99: pct(&durations, 0.99),
                redis_calls,
                failures,
                last_status,
                connect_errors,
            };

            println!(
                "{:>7}  {:>10.0}  {:>8.1}  {:>7.2}ms  {:>7.2}ms  {:>7.2}ms  {:>7}  {}",
                run.concurrency,
                run.req_per_sec,
                (*bytes as f64 * run.req_per_sec) / (1024.0 * 1024.0),
                run.p50,
                run.p95,
                run.p99,
                run.redis_calls,
                annotate(&run, prev.as_ref(), total)
            );

            cells.push(Cell {
                label,
                concurrency,
                run,
            });
            if run.connect_errors > total / 10 {
                println!("\nstopping, the client machine is the bottleneck not the server");
                break;
            }
            prev = Some(run);
        }
    }

    cells
}

/// The harness fills the buffer with synthetic events, trimming between passes keeps
/// a dev Redis from hitting maxmemory when no worker is draining.
async fn trim_stream(redis_url: &str) {
    if let Ok(client) = redis::Client::open(redis_url)
        && let Ok(mut conn) = client.get_multiplexed_async_connection().await
    {
        let _: Result<i64, _> = redis::cmd("XTRIM")
            .arg("von:event-buffer")
            .arg("MAXLEN")
            .arg(0)
            .query_async(&mut conn)
            .await;
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    let url = args
        .get(1)
        .cloned()
        .unwrap_or_else(|| "http://127.0.0.1:8090/webhooks".to_owned());
    let key = args.get(2).cloned().unwrap_or_else(|| "bench".to_owned());
    let requests: usize = args.get(3).and_then(|v| v.parse().ok()).unwrap_or(2000);
    let passes: usize = args.get(4).and_then(|v| v.parse().ok()).unwrap_or(3).max(1);
    let redis_url =
        std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:16379".to_owned());

    let client = reqwest::Client::builder()
        .pool_max_idle_per_host(20_000)
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    println!("sweeping {url} with {requests} requests per level, {passes} passes");

    let mut all: Vec<Cell> = Vec::new();
    for pass in 1..=passes {
        println!("\n=== pass {pass} of {passes} ===");
        all.extend(one_pass(&client, &url, &key, requests, &redis_url).await);
        if pass < passes {
            trim_stream(&redis_url).await;
        }
    }

    if passes < 2 {
        return Ok(());
    }

    // Medians across passes are the numbers worth quoting, single runs are noise.
    for (label, bytes, divisor) in MATRIX {
        let total = (requests / divisor).max(200);
        println!("\nmedians at {label} payload across {passes} passes\n");
        println!(
            "{:>7}  {:>10}  {:>8}  {:>8}  {:>8}  {:>8}  notes",
            "clients", "req/s", "MB/s", "p50", "p95", "p99"
        );
        let mut prev: Option<Run> = None;
        for &concurrency in LEVELS {
            let rows: Vec<&Cell> = all
                .iter()
                .filter(|c| c.label == *label && c.concurrency == concurrency)
                .collect();
            if rows.is_empty() {
                continue;
            }
            let run = Run {
                concurrency,
                req_per_sec: median(
                    &mut rows.iter().map(|c| c.run.req_per_sec).collect::<Vec<_>>(),
                ),
                p50: median(&mut rows.iter().map(|c| c.run.p50).collect::<Vec<_>>()),
                p95: median(&mut rows.iter().map(|c| c.run.p95).collect::<Vec<_>>()),
                p99: median(&mut rows.iter().map(|c| c.run.p99).collect::<Vec<_>>()),
                redis_calls: rows.iter().map(|c| c.run.redis_calls).min().unwrap_or(0),
                failures: rows.iter().map(|c| c.run.failures).max().unwrap_or(0),
                last_status: rows.iter().map(|c| c.run.last_status).max().unwrap_or(0),
                connect_errors: rows.iter().map(|c| c.run.connect_errors).max().unwrap_or(0),
            };
            println!(
                "{:>7}  {:>10.0}  {:>8.1}  {:>7.2}ms  {:>7.2}ms  {:>7.2}ms  {}",
                run.concurrency,
                run.req_per_sec,
                (*bytes as f64 * run.req_per_sec) / (1024.0 * 1024.0),
                run.p50,
                run.p95,
                run.p99,
                annotate(&run, prev.as_ref(), total)
            );
            prev = Some(run);
        }
    }

    Ok(())
}
