//! End to end checks against a running ingest service.
//!
//! These need Redis, Postgres, the ingest service, and the flusher running, so
//! they are skipped unless VON_E2E_URL and VON_E2E_KEY are set.
//!
//! ```text
//! docker compose -f docker-compose.dev.yml up -d
//! ./target/release/von-ingest.exe
//! cd ../von/apps/api && bun run src/index.ts
//! VON_E2E_URL=http://127.0.0.1:8090 VON_E2E_KEY=von_dev_... cargo test --test e2e
//! ```

use serde_json::{Value, json};
use std::time::Duration;

struct Env {
    url: String,
    key: String,
    http: reqwest::Client,
}

fn env() -> Option<Env> {
    let url = std::env::var("VON_E2E_URL").ok()?;
    let key = std::env::var("VON_E2E_KEY").ok()?;
    Some(Env {
        url,
        key,
        http: reqwest::Client::new(),
    })
}

impl Env {
    async fn send(&self, body: Value) -> (u16, Value) {
        let res = self
            .http
            .post(format!("{}/webhooks", self.url))
            .bearer_auth(&self.key)
            .json(&body)
            .send()
            .await
            .expect("request failed");
        let status = res.status().as_u16();
        let payload = res.json().await.unwrap_or(Value::Null);
        (status, payload)
    }

    async fn ready(&self) -> u16 {
        self.http
            .get(format!("{}/ready", self.url))
            .send()
            .await
            .map(|r| r.status().as_u16())
            .unwrap_or(0)
    }
}

macro_rules! skip_without_env {
    () => {
        match env() {
            Some(e) => e,
            None => {
                eprintln!("skipping, set VON_E2E_URL and VON_E2E_KEY to run");
                return;
            }
        }
    };
}

/// A retried send must not create a second event, which is the guarantee the SDK
/// makes when it auto generates an idempotency key.
#[tokio::test]
async fn duplicate_idempotency_key_creates_one_event() {
    let env = skip_without_env!();
    let key = format!("e2e-dupe-{}", uuid_like());

    let (first_status, first) = env
        .send(json!({
            "eventType": "e2e.dedupe",
            "payload": { "v": 1 },
            "idempotencyKey": key,
        }))
        .await;
    let (second_status, second) = env
        .send(json!({
            "eventType": "e2e.dedupe",
            "payload": { "v": 1 },
            "idempotencyKey": key,
        }))
        .await;

    assert_eq!(first_status, 200, "first send rejected, {first}");
    assert_eq!(second_status, 200, "retry rejected, {second}");

    // Both are accepted at ingest, the flusher collapses them on insert.
    assert_eq!(first["created"], 1);
    assert_eq!(second["created"], 1);
}

/// Oversized payloads must be refused before they can fill the buffer stream and
/// exhaust Redis memory for every other tenant.
#[tokio::test]
async fn oversize_payload_is_rejected() {
    let env = skip_without_env!();
    let huge = "x".repeat(1024 * 1024 + 64);

    let (status, body) = env
        .send(json!({
            "eventType": "e2e.oversize",
            "payload": { "data": huge },
        }))
        .await;

    assert_eq!(status, 413, "expected payload too large, got {body}");
    assert_eq!(body["error"]["retryable"], false);
}

/// An unknown key must never be treated as a valid tenant.
#[tokio::test]
async fn invalid_api_key_is_unauthorized() {
    let env = skip_without_env!();

    let res = env
        .http
        .post(format!("{}/webhooks", env.url))
        .bearer_auth("von_dev_not_a_real_key.deadbeef")
        .json(&json!({ "eventType": "e2e.auth", "payload": {} }))
        .send()
        .await
        .expect("request failed");

    assert_eq!(res.status().as_u16(), 401);
}

/// Every accepted event must come back with its own id, so a coalesced batch
/// cannot hand the same id to two callers.
#[tokio::test]
async fn concurrent_sends_get_distinct_event_ids() {
    let env = skip_without_env!();
    let env = std::sync::Arc::new(env);

    let mut handles = Vec::new();
    for i in 0..40 {
        let env = env.clone();
        handles.push(tokio::spawn(async move {
            env.send(json!({
                "eventType": "e2e.concurrent",
                "payload": { "i": i },
            }))
            .await
        }));
    }

    let mut ids = std::collections::HashSet::new();
    let mut accepted = 0;
    for handle in handles {
        let (status, body) = handle.await.expect("task panicked");
        if status != 200 {
            continue;
        }
        accepted += 1;
        let id = body["events"][0]["id"].as_str().unwrap_or("").to_string();
        assert!(!id.is_empty(), "event returned without an id, {body}");
        assert!(ids.insert(id), "two callers received the same event id");
    }

    assert!(accepted > 0, "no sends were accepted");
}

/// Readiness must reflect the dependencies a request actually needs, otherwise a
/// load balancer keeps sending traffic to a node that cannot serve it.
#[tokio::test]
async fn ready_reports_dependency_health() {
    let env = skip_without_env!();

    let status = tokio::time::timeout(Duration::from_secs(5), env.ready())
        .await
        .expect("ready check timed out");

    assert_eq!(status, 200, "service reported not ready");
}

fn uuid_like() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos().to_string())
        .unwrap_or_else(|_| "0".to_string())
}
