// Closed loop benchmark, accept through flusher and worker to a local sink,
// measuring the delivery latency users actually feel. Requires von-ingest and von-worker running.

use axum::extract::State;
use axum::http::HeaderMap;
use dashmap::DashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

const EVENT_TYPE: &str = "bench.e2e";

struct Sink {
    arrivals: DashMap<String, Instant>,
}

async fn hook(State(sink): State<Arc<Sink>>, headers: HeaderMap) -> &'static str {
    if let Some(event_id) = headers.get("x-von-event-id").and_then(|v| v.to_str().ok()) {
        sink.arrivals
            .entry(event_id.to_owned())
            .or_insert_with(Instant::now);
    }
    "ok"
}

fn pct(sorted: &[f64], p: f64) -> f64 {
    if sorted.is_empty() {
        return 0.0;
    }
    sorted[((sorted.len() as f64 * p) as usize).min(sorted.len() - 1)]
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    let args: Vec<String> = std::env::args().collect();
    let url = args
        .get(1)
        .cloned()
        .unwrap_or_else(|| "http://127.0.0.1:8090/webhooks".to_owned());
    let key = args.get(2).cloned().unwrap_or_else(|| "bench".to_owned());
    let total: usize = args.get(3).and_then(|v| v.parse().ok()).unwrap_or(500);
    let slug = args
        .get(4)
        .cloned()
        .unwrap_or_else(|| "bench-enterprise".to_owned());
    let json = args.iter().any(|a| a == "--json");

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(4)
        .connect(&std::env::var("DATABASE_URL")?)
        .await?;

    let organization_id: String =
        sqlx::query_scalar("SELECT id::text FROM organization WHERE slug = $1")
            .bind(&slug)
            .fetch_optional(&pool)
            .await?
            .ok_or(format!("no organization with slug {slug}"))?;

    let sink = Arc::new(Sink {
        arrivals: DashMap::new(),
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await?;
    let sink_url = format!("http://{}/hook", listener.local_addr()?);
    let app = axum::Router::new()
        .route("/hook", axum::routing::post(hook))
        .with_state(sink.clone());
    tokio::spawn(async move {
        let _ = axum::serve(listener, app).await;
    });

    let endpoint_id = uuid::Uuid::new_v4();
    sqlx::query(
        "INSERT INTO endpoint (id, organization_id, url, secret, status, max_attempts, \
         timeout_ms, events, created_at, updated_at) \
         VALUES ($1, $2::uuid, $3, 'whsec_bench_e2e', 'active', 1, 5000, $4, now(), now())",
    )
    .bind(endpoint_id)
    .bind(&organization_id)
    .bind(&sink_url)
    .bind(vec![EVENT_TYPE.to_owned()])
    .execute(&pool)
    .await?;

    let client = reqwest::Client::new();
    let body = serde_json::json!({ "eventType": EVENT_TYPE, "payload": { "warm": true } });

    // The ingest auth cache holds the pre-insert endpoint list for up to 10 seconds,
    // so warm until the sink sees a delivery before measuring anything.
    let warm_deadline = Instant::now() + Duration::from_secs(20);
    loop {
        let _ = client.post(&url).bearer_auth(&key).json(&body).send().await;
        tokio::time::sleep(Duration::from_millis(500)).await;
        if !sink.arrivals.is_empty() {
            sink.arrivals.clear();
            break;
        }
        if Instant::now() > warm_deadline {
            sqlx::query("DELETE FROM endpoint WHERE id = $1")
                .bind(endpoint_id)
                .execute(&pool)
                .await?;
            return Err("warmup never reached the sink, are ingest and worker running".into());
        }
    }

    let mut sent: Vec<(String, Instant)> = Vec::with_capacity(total);
    let started = Instant::now();
    for i in 0..total {
        let body = serde_json::json!({ "eventType": EVENT_TYPE, "payload": { "i": i } });
        let sent_at = Instant::now();
        let res = client
            .post(&url)
            .bearer_auth(&key)
            .json(&body)
            .send()
            .await?;
        let parsed: serde_json::Value = res.json().await?;
        if let Some(id) = parsed["events"][0]["id"].as_str() {
            sent.push((id.to_owned(), sent_at));
        }
    }

    let deadline = Instant::now() + Duration::from_secs(120);
    while sink.arrivals.len() < sent.len() && Instant::now() < deadline {
        tokio::time::sleep(Duration::from_millis(50)).await;
    }
    let wall = started.elapsed().as_secs_f64();

    let mut latencies: Vec<f64> = sent
        .iter()
        .filter_map(|(id, sent_at)| {
            sink.arrivals
                .get(id)
                .map(|arrived| arrived.duration_since(*sent_at).as_secs_f64() * 1000.0)
        })
        .collect();
    latencies.sort_by(|a, b| a.partial_cmp(b).unwrap());

    sqlx::query("DELETE FROM endpoint WHERE id = $1")
        .bind(endpoint_id)
        .execute(&pool)
        .await?;

    let delivered = latencies.len();
    let p50 = pct(&latencies, 0.50);
    let p95 = pct(&latencies, 0.95);
    let p99 = pct(&latencies, 0.99);
    let rate = delivered as f64 / wall;

    if json {
        println!(
            "{}",
            serde_json::json!({
                "sent": sent.len(),
                "delivered": delivered,
                "lost": sent.len() - delivered,
                "deliveries_per_sec": (rate * 10.0).round() / 10.0,
                "e2e_p50_ms": (p50 * 100.0).round() / 100.0,
                "e2e_p95_ms": (p95 * 100.0).round() / 100.0,
                "e2e_p99_ms": (p99 * 100.0).round() / 100.0,
            })
        );
    } else {
        println!(
            "{delivered}/{} delivered  {rate:>7.1} deliveries/s  e2e p50 {p50:>8.2}ms  p95 {p95:>8.2}ms  p99 {p99:>8.2}ms",
            sent.len()
        );
        if delivered < sent.len() {
            println!(
                "!! {} events never reached the sink",
                sent.len() - delivered
            );
        }
    }

    Ok(())
}
