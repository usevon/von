// Closed loop benchmark, accept through flusher and worker to a local sink,
// measuring the delivery latency users actually feel. Requires von-ingest and von-worker running.

use axum::extract::State;
use axum::http::HeaderMap;
use dashmap::DashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

const EVENT_TYPE: &str = "bench.e2e";

// Sweep order for --plans, enterprise last so the org is restored to unmetered.
const PLANS: [(&str, &str); 5] = [
    ("hobby", "Free"),
    ("starter", "Starter"),
    ("growth", "Growth"),
    ("scale", "Scale"),
    ("enterprise", "Unmetered"),
];

struct Sink {
    arrivals: DashMap<String, Instant>,
}

struct Pass {
    sent: usize,
    delivered: usize,
    rate: f64,
    p50: f64,
    p95: f64,
    p99: f64,
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

async fn measure(
    client: &reqwest::Client,
    url: &str,
    key: &str,
    sink: &Sink,
    total: usize,
) -> Result<Pass, Box<dyn std::error::Error>> {
    sink.arrivals.clear();

    let mut sent: Vec<(String, Instant)> = Vec::with_capacity(total);
    let started = Instant::now();
    for i in 0..total {
        let body = serde_json::json!({ "eventType": EVENT_TYPE, "payload": { "i": i } });
        let sent_at = Instant::now();
        let res = client.post(url).bearer_auth(key).json(&body).send().await?;
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

    Ok(Pass {
        sent: sent.len(),
        delivered: latencies.len(),
        rate: latencies.len() as f64 / wall,
        p50: pct(&latencies, 0.50),
        p95: pct(&latencies, 0.95),
        p99: pct(&latencies, 0.99),
    })
}

// Flips the org's plan and evicts the ingest tenant cache so it applies immediately.
async fn set_plan(
    pool: &sqlx::PgPool,
    redis: &mut redis::aio::MultiplexedConnection,
    organization_id: &str,
    plan: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    sqlx::query("UPDATE organization SET plan = $1 WHERE id = $2::uuid")
        .bind(plan)
        .bind(organization_id)
        .execute(pool)
        .await?;

    let month = chrono::Utc::now().format("%Y-%m").to_string();
    let _: () = redis::pipe()
        .cmd("DEL")
        .arg(format!("{{{organization_id}}}:deliveries:{month}"))
        .ignore()
        .cmd("PUBLISH")
        .arg("von:auth:invalidate")
        .arg(organization_id)
        .ignore()
        .query_async(redis)
        .await?;
    tokio::time::sleep(Duration::from_millis(500)).await;
    Ok(())
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
    let plans = args.iter().any(|a| a == "--plans");

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(4)
        .connect(&std::env::var("DATABASE_URL")?)
        .await?;
    let mut redis = redis::Client::open(std::env::var("REDIS_URL")?)?
        .get_multiplexed_async_connection()
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

    if plans {
        println!(
            "{:>10}  {:>16}  {:>14}  {:>9}  {:>9}",
            "plan", "delivered", "deliveries/s", "p50", "p95"
        );
        for (plan, label) in PLANS {
            set_plan(&pool, &mut redis, &organization_id, plan).await?;
            let pass = measure(&client, &url, &key, &sink, total).await?;
            println!(
                "{label:>10}  {:>7}/{:<8}  {:>14.1}  {:>7.0}ms  {:>7.0}ms",
                pass.delivered, pass.sent, pass.rate, pass.p50, pass.p95
            );
        }
    } else {
        let pass = measure(&client, &url, &key, &sink, total).await?;
        if json {
            println!(
                "{}",
                serde_json::json!({
                    "sent": pass.sent,
                    "delivered": pass.delivered,
                    "lost": pass.sent - pass.delivered,
                    "deliveries_per_sec": (pass.rate * 10.0).round() / 10.0,
                    "e2e_p50_ms": (pass.p50 * 100.0).round() / 100.0,
                    "e2e_p95_ms": (pass.p95 * 100.0).round() / 100.0,
                    "e2e_p99_ms": (pass.p99 * 100.0).round() / 100.0,
                })
            );
        } else {
            println!(
                "{}/{} delivered  {:>7.1} deliveries/s  e2e p50 {:>8.2}ms  p95 {:>8.2}ms  p99 {:>8.2}ms",
                pass.delivered, pass.sent, pass.rate, pass.p50, pass.p95, pass.p99
            );
            if pass.delivered < pass.sent {
                println!(
                    "!! {} events never reached the sink",
                    pass.sent - pass.delivered
                );
            }
        }
    }

    sqlx::query("DELETE FROM endpoint WHERE id = $1")
        .bind(endpoint_id)
        .execute(&pool)
        .await?;

    Ok(())
}
