use std::time::Instant;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    let url = args
        .get(1)
        .cloned()
        .unwrap_or_else(|| "http://127.0.0.1:8090/webhooks".to_owned());
    let key = args.get(2).cloned().unwrap_or_else(|| "bench".to_owned());
    let iterations: usize = args.get(3).and_then(|v| v.parse().ok()).unwrap_or(200);
    let concurrency: usize = args.get(4).and_then(|v| v.parse().ok()).unwrap_or(1);

    let batch: usize = args.get(5).and_then(|v| v.parse().ok()).unwrap_or(0);

    let client = reqwest::Client::builder().build()?;
    let body = if batch > 0 {
        serde_json::json!({
            "events": (0..batch)
                .map(|i| serde_json::json!({
                    "eventType": "bench.batch",
                    "payload": { "i": i }
                }))
                .collect::<Vec<_>>()
        })
    } else {
        serde_json::json!({
            "eventType": "bench.test",
            "payload": { "ts": 1 }
        })
    };
    let events_per_req = if batch > 0 { batch } else { 1 };

    for i in 0..5 {
        let _ = client
            .post(&url)
            .bearer_auth(&key)
            .header("x-forwarded-for", format!("10.98.0.{i}"))
            .json(&body)
            .send()
            .await;
    }

    let mut durations: Vec<f64> = Vec::with_capacity(iterations);
    let mut ok_count = 0usize;
    let mut bad_status: Option<u16> = None;
    let started = Instant::now();

    if concurrency <= 1 {
        for i in 0..iterations {
            let t0 = Instant::now();
            let res = client
                .post(&url)
                .bearer_auth(&key)
                .header("x-forwarded-for", format!("10.97.{}.{}", i / 256, i % 256))
                .json(&body)
                .send()
                .await?;
            let status = res.status();
            if status.is_success() {
                ok_count += 1;
            } else {
                bad_status = Some(status.as_u16());
            }
            let _ = res.bytes().await?;
            durations.push(t0.elapsed().as_secs_f64() * 1000.0);
        }
    } else {
        // A worker pool keeps exactly `concurrency` in flight, a per-round barrier
        // would bind throughput to the slowest request of every round.
        let counter = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let mut handles = Vec::with_capacity(concurrency);
        for _ in 0..concurrency {
            let client = client.clone();
            let url = url.clone();
            let key = key.clone();
            let body = body.clone();
            let counter = counter.clone();
            handles.push(tokio::spawn(async move {
                let mut results = Vec::new();
                loop {
                    let idx = counter.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                    if idx >= iterations {
                        break;
                    }
                    let t0 = Instant::now();
                    let res = client
                        .post(&url)
                        .bearer_auth(&key)
                        .header(
                            "x-forwarded-for",
                            format!("10.96.{}.{}", idx / 256, idx % 256),
                        )
                        .json(&body)
                        .send()
                        .await;
                    let mut code = 0u16;
                    if let Ok(res) = res {
                        code = res.status().as_u16();
                        let _ = res.bytes().await;
                    }
                    results.push((t0.elapsed().as_secs_f64() * 1000.0, code));
                }
                results
            }));
        }
        for h in handles {
            for (ms, code) in h.await? {
                durations.push(ms);
                if (200..300).contains(&code) {
                    ok_count += 1;
                } else {
                    bad_status = Some(code);
                }
            }
        }
    }

    let wall = started.elapsed().as_secs_f64();
    durations.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let p50 = durations[durations.len() / 2];
    let p95 = durations[(durations.len() as f64 * 0.95) as usize];
    let ops = durations.len() as f64 / wall;

    let failures = durations.len() - ok_count;
    let warning = if failures > 0 {
        format!(
            "  !! {} FAILED (last status {})",
            failures,
            bad_status.unwrap_or(0)
        )
    } else {
        String::new()
    };

    println!(
        "{:>8.0} req/s  {:>9.0} events/s  p50 {:>7.2}ms  p95 {:>7.2}ms  n={} concurrency={} batch={}{}",
        ops,
        ops * events_per_req as f64,
        p50,
        p95,
        durations.len(),
        concurrency,
        events_per_req,
        warning
    );
    Ok(())
}
