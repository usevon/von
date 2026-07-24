#![allow(dead_code)]

use hmac::{Hmac, Mac};
use sha2::Sha256;
use sqlx::{PgPool, Row};
use std::sync::{Arc, Mutex};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use von_types::{BufferedDelivery, BufferedEntry, BufferedEvent, STREAM_KEY};
use von_worker::{delivery::Worker, flusher::Flusher, inbound::Inbound};

pub struct Hit {
    pub body: String,
    pub signature: String,
    pub event_type: String,
}

/// Stands in for a customer endpoint, failing the first `failures` requests.
pub struct Probe {
    pub url: String,
    hits: Arc<Mutex<Vec<Hit>>>,
}

impl Probe {
    pub async fn start(failures: usize) -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind");
        let port = listener.local_addr().expect("addr").port();
        let hits = Arc::new(Mutex::new(Vec::new()));
        let recorded = hits.clone();

        tokio::spawn(async move {
            let mut remaining = failures;
            loop {
                let Ok((mut socket, _)) = listener.accept().await else {
                    break;
                };
                let mut buffer = vec![0u8; 65536];
                let Ok(read) = socket.read(&mut buffer).await else {
                    continue;
                };
                let request = String::from_utf8_lossy(&buffer[..read]).to_string();
                let header = |name: &str| {
                    request
                        .lines()
                        .find(|l| l.to_lowercase().starts_with(&format!("{name}:")))
                        .and_then(|l| l.split_once(':'))
                        .map(|(_, v)| v.trim().to_owned())
                        .unwrap_or_default()
                };
                let body = request
                    .split_once("\r\n\r\n")
                    .map(|(_, b)| b.to_owned())
                    .unwrap_or_default();

                recorded.lock().expect("lock").push(Hit {
                    body,
                    signature: header("x-von-signature"),
                    event_type: header("x-von-event-type"),
                });

                let status = if remaining > 0 {
                    remaining = remaining.saturating_sub(1);
                    "500 Internal Server Error"
                } else {
                    "200 OK"
                };
                let _ = socket
                    .write_all(
                        format!(
                            "HTTP/1.1 {status}\r\ncontent-length: 2\r\nconnection: close\r\n\r\nok"
                        )
                        .as_bytes(),
                    )
                    .await;
                let _ = socket.shutdown().await;
            }
        });

        Self {
            url: format!("http://127.0.0.1:{port}/hook"),
            hits,
        }
    }

    pub fn hits(&self) -> Vec<String> {
        self.hits
            .lock()
            .expect("lock")
            .iter()
            .map(|h| h.body.clone())
            .collect()
    }

    pub fn last(&self) -> Option<(String, String, String)> {
        self.hits
            .lock()
            .expect("lock")
            .first()
            .map(|h| (h.body.clone(), h.signature.clone(), h.event_type.clone()))
    }
}

#[derive(Debug)]
pub struct Attempt {
    pub attempt_number: i32,
    pub outcome: String,
    pub is_final: bool,
    pub http_status: Option<i32>,
}

pub struct Fixture {
    pub pool: PgPool,
    pub redis: redis::aio::ConnectionManager,
    pub flusher: Flusher,
    pub worker: Worker,
    pub inbound: Inbound,
    pub organization_id: String,
    pub endpoint_id: String,
    pub secret: String,
}

impl Fixture {
    pub async fn new() -> Option<Self> {
        dotenvy::from_path("../../.env").ok();
        // A fast backoff keeps the retry tests from sleeping through real second-scale waits.
        unsafe { std::env::set_var("WORKER_BACKOFF_BASE_SECS", "0.05") };
        let (Ok(database_url), Ok(redis_url)) =
            (std::env::var("DATABASE_URL"), std::env::var("REDIS_URL"))
        else {
            eprintln!("skipping, DATABASE_URL and REDIS_URL are required");
            return None;
        };

        let pool = PgPool::connect(&database_url).await.ok()?;
        let client = redis::Client::open(redis_url).ok()?;
        let redis = redis::aio::ConnectionManager::new(client).await.ok()?;

        let organization_id: String =
            sqlx::query_scalar("SELECT id::text FROM organization LIMIT 1")
                .fetch_optional(&pool)
                .await
                .ok()??;

        let flusher = Flusher::new(pool.clone(), redis.clone()).await;
        let worker = Worker::new(pool.clone(), redis.clone()).await.ok()?;
        let inbound = Inbound::new(pool.clone()).await;

        Some(Self {
            pool,
            redis,
            flusher,
            worker,
            inbound,
            organization_id,
            endpoint_id: uuid::Uuid::new_v4().to_string(),
            secret: format!("whsec_{}", uuid::Uuid::new_v4()),
        })
    }

    pub async fn create_inbound_endpoint(&self, url: &str) -> String {
        let id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO inbound_endpoint (id, organization_id, forward_url, secret, status, \
             timeout_ms, created_at, updated_at) \
             VALUES ($1::uuid, $2::uuid, $3, $4, 'active', 5000, now(), now())",
        )
        .bind(&id)
        .bind(&self.organization_id)
        .bind(url)
        .bind(von_api::cipher::encrypt_secret(&self.secret).expect("encrypt"))
        .execute(&self.pool)
        .await
        .expect("create inbound endpoint");
        id
    }

    /// Inserts a pending inbound delivery, which is exactly what the receive handler writes.
    pub async fn enqueue_inbound(&self, endpoint_id: &str, payload: &str) -> String {
        let id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO inbound_delivery (id, inbound_endpoint_id, payload, status, created_at) \
             VALUES ($1::uuid, $2::uuid, $3::jsonb, 'pending', now())",
        )
        .bind(&id)
        .bind(endpoint_id)
        .bind(payload)
        .execute(&self.pool)
        .await
        .expect("enqueue inbound");
        id
    }

    /// Deleting the endpoint cascades its inbound deliveries away with it.
    pub async fn delete_inbound_endpoint(&self, endpoint_id: &str) {
        let _ = sqlx::query("DELETE FROM inbound_endpoint WHERE id = $1::uuid")
            .bind(endpoint_id)
            .execute(&self.pool)
            .await;
    }

    pub async fn inbound_status(&self, delivery_id: &str) -> Option<String> {
        sqlx::query_scalar("SELECT status FROM inbound_delivery WHERE id = $1::uuid")
            .bind(delivery_id)
            .fetch_optional(&self.pool)
            .await
            .ok()
            .flatten()
    }

    pub async fn settle_inbound_until<F>(&self, mut done: F) -> bool
    where
        F: AsyncFnMut() -> bool,
    {
        for _ in 0..200 {
            let _ = self.inbound.tick().await;
            if done().await {
                return true;
            }
            tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        }
        false
    }

    pub async fn create_endpoint(&self, id: &str, url: &str, secret: &str, max_attempts: i32) {
        sqlx::query(
            "INSERT INTO endpoint (id, organization_id, url, secret, status, max_attempts, \
             timeout_ms, events, created_at, updated_at) \
             VALUES ($1::uuid, $2::uuid, $3, $4, 'active', $5, 5000, $6, now(), now())",
        )
        .bind(id)
        .bind(&self.organization_id)
        .bind(url)
        .bind(von_api::cipher::encrypt_secret(secret).expect("encrypt"))
        .bind(max_attempts)
        .bind(vec!["worker.probe".to_owned()])
        .execute(&self.pool)
        .await
        .expect("create endpoint");
    }

    /// Writes straight to the buffer stream, which is exactly what ingest emits.
    pub async fn enqueue_event(&self, payload: &str) -> String {
        self.enqueue_inner(payload, None, std::slice::from_ref(&self.endpoint_id))
            .await
    }

    /// Two events sharing a key collide on insert, so the second one's delivery must be dropped.
    pub async fn enqueue_event_with_key(&self, payload: &str, key: &str) -> String {
        self.enqueue_inner(
            payload,
            Some(key.to_owned()),
            std::slice::from_ref(&self.endpoint_id),
        )
        .await
    }

    pub async fn enqueue_fanout(&self, payload: &str, endpoint_ids: &[String]) -> String {
        self.enqueue_inner(payload, None, endpoint_ids).await
    }

    async fn enqueue_inner(
        &self,
        payload: &str,
        idempotency_key: Option<String>,
        endpoint_ids: &[String],
    ) -> String {
        let event_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let deliveries = endpoint_ids
            .iter()
            .map(|endpoint_id| BufferedDelivery {
                id: uuid::Uuid::new_v4().to_string(),
                organization_id: self.organization_id.clone(),
                event_id: event_id.clone(),
                endpoint_id: endpoint_id.clone(),
                status: "pending".to_owned(),
                attempts: 0,
                created_at: now.clone(),
            })
            .collect();
        let entry = BufferedEntry {
            events: vec![BufferedEvent {
                id: event_id.clone(),
                organization_id: self.organization_id.clone(),
                event_type: "worker.probe".to_owned(),
                payload: serde_json::value::RawValue::from_string(payload.to_owned())
                    .expect("payload"),
                idempotency_key,
                created_at: now,
            }],
            deliveries,
        };

        let (field, payload) = von_types::encode_entry(&entry).expect("encode");
        let mut conn = self.redis.clone();
        let _: redis::RedisResult<String> = redis::cmd("XADD")
            .arg(STREAM_KEY)
            .arg("*")
            .arg(field)
            .arg(payload)
            .query_async(&mut conn)
            .await;

        event_id
    }

    /// Moves a delivery's next_attempt_at, so a test can simulate a lease held by a dead worker
    /// or force a row back onto the poll.
    pub async fn set_next_attempt(&self, event_id: &str, secs_from_now: i64) {
        sqlx::query(
            "UPDATE delivery SET next_attempt_at = now() + make_interval(secs => $1) WHERE event_id = $2::uuid",
        )
        .bind(secs_from_now as f64)
        .bind(event_id)
        .execute(&self.pool)
        .await
        .expect("set next_attempt");
    }

    pub async fn settle_until<F>(&self, mut done: F) -> bool
    where
        F: AsyncFnMut() -> bool,
    {
        for _ in 0..200 {
            let _ = self.flusher.tick().await;
            let _ = self.worker.tick().await;
            if done().await {
                return true;
            }
            tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        }
        false
    }

    pub async fn delivery_status(&self, event_id: &str) -> Option<String> {
        sqlx::query_scalar("SELECT status FROM delivery WHERE event_id = $1::uuid")
            .bind(event_id)
            .fetch_optional(&self.pool)
            .await
            .ok()
            .flatten()
    }

    pub async fn delivery_attempts_column(&self, event_id: &str) -> i32 {
        sqlx::query_scalar("SELECT attempts FROM delivery WHERE event_id = $1::uuid")
            .bind(event_id)
            .fetch_optional(&self.pool)
            .await
            .ok()
            .flatten()
            .unwrap_or(0)
    }

    pub async fn event_exists(&self, event_id: &str) -> bool {
        sqlx::query("SELECT 1 FROM event WHERE id = $1::uuid")
            .bind(event_id)
            .fetch_optional(&self.pool)
            .await
            .ok()
            .flatten()
            .is_some()
    }

    pub async fn attempts(&self, event_id: &str) -> Vec<Attempt> {
        sqlx::query(
            "SELECT attempt_number, outcome, is_final, http_status FROM delivery_attempt \
             WHERE event_id = $1::uuid ORDER BY attempt_number",
        )
        .bind(event_id)
        .fetch_all(&self.pool)
        .await
        .unwrap_or_default()
        .iter()
        .map(|row| Attempt {
            attempt_number: row.try_get("attempt_number").unwrap_or_default(),
            outcome: row.try_get("outcome").unwrap_or_default(),
            is_final: row.try_get("is_final").unwrap_or_default(),
            http_status: row.try_get("http_status").unwrap_or_default(),
        })
        .collect()
    }

    pub async fn endpoint_circuit(&self) -> (i32, String) {
        let row =
            sqlx::query("SELECT failure_count, circuit_state FROM endpoint WHERE id = $1::uuid")
                .bind(&self.endpoint_id)
                .fetch_one(&self.pool)
                .await
                .expect("endpoint");
        (
            row.try_get("failure_count").unwrap_or_default(),
            row.try_get("circuit_state").unwrap_or_default(),
        )
    }

    pub async fn cleanup(&self) {
        let _ = sqlx::query("DELETE FROM endpoint WHERE id = $1::uuid")
            .bind(&self.endpoint_id)
            .execute(&self.pool)
            .await;
    }
}

pub fn signature_matches(header: &str, body: &str, secret: &str) -> bool {
    let mut timestamp = None;
    let mut v1 = None;
    for part in header.split(',') {
        match part.split_once('=') {
            Some(("t", value)) => timestamp = Some(value),
            Some(("v1", value)) => v1 = Some(value),
            _ => {}
        }
    }
    let (Some(timestamp), Some(v1)) = (timestamp, v1) else {
        return false;
    };

    let mut mac = match Hmac::<Sha256>::new_from_slice(secret.as_bytes()) {
        Ok(mac) => mac,
        Err(_) => return false,
    };
    mac.update(format!("{timestamp}.{body}").as_bytes());
    hex::encode(mac.finalize().into_bytes()) == v1
}
