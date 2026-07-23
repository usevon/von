use std::time::Instant;

const LEVELS: &[usize] = &[1, 10, 50, 100, 200, 500, 1000, 2000, 5000, 10000];

/// Spans a tiny ping through the practical ceiling most webhook providers accept.
const PAYLOAD_SIZES: &[(&str, usize)] = &[
    ("tiny", 0),
    ("typical 1KB", 1024),
    ("large 16KB", 16 * 1024),
    ("max 64KB", 64 * 1024),
    ("oversize 256KB", 256 * 1024),
];

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

struct Run {
    concurrency: usize,
    req_per_sec: f64,
    p50: f64,
    p95: f64,
    p99: f64,
    redis_calls: u64,
    failures: usize,
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
) -> (Vec<f64>, usize, usize, f64) {
    let body = serde_json::json!({
        "eventType": "sweep.test",
        "payload": payload_of(payload_bytes)
    });

    let mut durations = Vec::with_capacity(total);
    let mut failures = 0usize;
    let mut connect_errors = 0usize;
    let started = Instant::now();
    let rounds = (total / concurrency).max(1);

    for r in 0..rounds {
        let mut handles = Vec::with_capacity(concurrency);
        for c in 0..concurrency {
            let client = client.clone();
            let url = url.to_owned();
            let key = key.to_owned();
            let body = body.clone();
            let idx = r * concurrency + c;
            handles.push(tokio::spawn(async move {
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
                let code = match res {
                    Ok(r) => {
                        let c = r.status().as_u16();
                        let _ = r.bytes().await;
                        c
                    }
                    Err(_) => 0,
                };
                (t0.elapsed().as_secs_f64() * 1000.0, code)
            }));
        }
        for h in handles {
            if let Ok((ms, code)) = h.await {
                durations.push(ms);
                if code == 0 {
                    connect_errors += 1;
                } else if !(200..300).contains(&code) {
                    failures += 1;
                }
            }
        }
    }

    (
        durations,
        failures,
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
        return format!("{} requests rejected by the server", run.failures);
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

    notes.join(", ")
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
    let redis_url =
        std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:56379".to_owned());

    let client = reqwest::Client::builder()
        .pool_max_idle_per_host(20_000)
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    println!("sweeping {url} with {requests} requests per level\n");
    println!(
        "{:>7}  {:>10}  {:>8}  {:>8}  {:>8}  {:>7}  notes",
        "clients", "req/s", "p50", "p95", "p99", "redis"
    );

    // Payload sweep finds the size ceiling and shows serialization cost.
    println!("\npayload sizes at concurrency 100\n");
    println!(
        "{:>16}  {:>10}  {:>8}  {:>8}  notes",
        "payload", "req/s", "p50", "p95"
    );
    for (label, bytes) in PAYLOAD_SIZES {
        let n = (requests / 4).max(200);
        let (mut d, failures, connect_errors, wall) =
            run_level(&client, &url, &key, n, 100, *bytes).await;
        d.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let note = if connect_errors > 0 {
            format!("{connect_errors} connection failures")
        } else if failures > 0 {
            format!("{failures} rejected, likely over the size limit")
        } else {
            let mbps = (*bytes as f64 * d.len() as f64 / wall) / (1024.0 * 1024.0);
            format!("{mbps:.0} MB/s ingested")
        };
        println!(
            "{:>16}  {:>10.0}  {:>7.2}ms  {:>7.2}ms  {}",
            label,
            d.len() as f64 / wall,
            pct(&d, 0.50),
            pct(&d, 0.95),
            note
        );
    }

    println!("\nconcurrency ramp at tiny payload\n");
    println!(
        "{:>7}  {:>10}  {:>8}  {:>8}  {:>8}  {:>7}  notes",
        "clients", "req/s", "p50", "p95", "p99", "redis"
    );

    let mut prev: Option<Run> = None;

    for &concurrency in LEVELS {
        if concurrency > requests {
            continue;
        }
        reset_stats(&redis_url).await;

        let (mut durations, failures, connect_errors, wall) =
            run_level(&client, &url, &key, requests, concurrency, 0).await;
        let redis_calls = evalsha_count(&redis_url).await;

        durations.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let run = Run {
            concurrency,
            req_per_sec: durations.len() as f64 / wall,
            p50: pct(&durations, 0.50),
            p95: pct(&durations, 0.95),
            p99: pct(&durations, 0.99),
            redis_calls,
            failures,
            connect_errors,
        };

        println!(
            "{:>7}  {:>10.0}  {:>7.2}ms  {:>7.2}ms  {:>7.2}ms  {:>7}  {}",
            run.concurrency,
            run.req_per_sec,
            run.p50,
            run.p95,
            run.p99,
            run.redis_calls,
            annotate(&run, prev.as_ref(), requests)
        );

        if run.connect_errors > requests / 10 {
            println!("\nstopping, the client machine is the bottleneck not the server");
            break;
        }
        prev = Some(run);
    }

    Ok(())
}
