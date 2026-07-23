use futures_util::stream::{self, StreamExt};
use hmac::{Hmac, Mac};
use redis::aio::ConnectionManager;
use sha2::Sha256;
use sqlx::{PgPool, Row};
use std::time::{Duration, Instant};
use tracing::error;
use von_error::Result;

const CIRCUIT_THRESHOLD: i32 = 5;
const CIRCUIT_RESET_SECS: i64 = 300;
const THROUGHPUT_RETRY_MS: i64 = 1000;
const BATCH_SIZE: i64 = 64;

fn worker_concurrency() -> usize {
    std::env::var("WORKER_CONCURRENCY")
        .ok()
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(50)
        .clamp(1, 500)
}

/// A claimed row's next_attempt_at is pushed out by this much, so a worker that dies mid-delivery
/// leaves the row pollable again once the lease expires.
fn lease_secs() -> f64 {
    std::env::var("WORKER_LEASE_SECS")
        .ok()
        .and_then(|v| v.parse::<f64>().ok())
        .unwrap_or(60.0)
}

/// A delivery claimed from the pending queue, carrying the event data the send needs.
struct Claimed {
    delivery_id: String,
    event_id: String,
    endpoint_id: String,
    organization_id: String,
    event_type: String,
    payload: String,
    plan: String,
    attempts: i32,
}

/// Token bucket capping one tenant's outbound delivery rate.
const THROUGHPUT_SCRIPT: &str = r#"
local key = KEYS[1]
local rate = tonumber(ARGV[1])
local burst = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])
local data = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(data[1])
local last_refill = tonumber(data[2])
if tokens == nil then
  tokens = burst
  last_refill = now
end
local elapsed = math.max(0, now - last_refill)
tokens = math.min(burst, tokens + elapsed * rate)
last_refill = now
if tokens >= requested then
  tokens = tokens - requested
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', last_refill)
  redis.call('EXPIRE', key, 60)
  return 1
end
redis.call('HMSET', key, 'tokens', tokens, 'last_refill', last_refill)
redis.call('EXPIRE', key, 60)
return 0
"#;

pub struct Worker {
    pool: PgPool,
    redis: ConnectionManager,
    http: reqwest::Client,
    concurrency: usize,
    lease_secs: f64,
}

struct Endpoint {
    url: String,
    secret: String,
    previous_secret: Option<String>,
    timeout_ms: i32,
    max_attempts: i32,
    circuit_state: String,
    circuit_opened_at: Option<chrono::NaiveDateTime>,
}

enum Outcome {
    Success {
        status: u16,
        duration_ms: i64,
    },
    Failure {
        status: Option<u16>,
        error: String,
        duration_ms: i64,
    },
}

impl Worker {
    pub async fn new(pool: PgPool, redis: ConnectionManager) -> Result<Self> {
        Ok(Self {
            pool,
            redis,
            // unwrap_or_default would silently re-enable redirect following and reopen the SSRF hole.
            http: reqwest::Client::builder()
                .redirect(reqwest::redirect::Policy::none())
                .build()
                .expect("reqwest client build"),
            concurrency: worker_concurrency(),
            lease_secs: lease_secs(),
        })
    }

    pub async fn tick(&self) -> Result<usize> {
        let claimed = self.claim().await?;
        let count = claimed.len();

        stream::iter(claimed)
            .for_each_concurrent(self.concurrency, |job| async move {
                if let Err(err) = self.process(&job).await {
                    // The lease re-exposes the row once it expires, so nothing is dropped.
                    error!(delivery_id = %job.delivery_id, error = %err, "delivery failed");
                }
            })
            .await;

        Ok(count)
    }

    /// Claims a batch of due deliveries with SKIP LOCKED, pushing their next_attempt_at out by the
    /// lease so no other worker takes them and a crash re-exposes them later.
    async fn claim(&self) -> Result<Vec<Claimed>> {
        let rows = sqlx::query(
            "WITH claimed AS ( \
               SELECT id FROM delivery \
               WHERE status = 'pending' AND next_attempt_at <= now() \
               ORDER BY next_attempt_at \
               FOR UPDATE SKIP LOCKED \
               LIMIT $2 \
             ) \
             UPDATE delivery d \
             SET next_attempt_at = now() + make_interval(secs => $1) \
             FROM claimed c, event e, organization o \
             WHERE d.id = c.id AND e.id = d.event_id AND o.id = d.organization_id \
             RETURNING d.id::text AS delivery_id, d.event_id::text AS event_id, \
               d.endpoint_id::text AS endpoint_id, d.organization_id::text AS organization_id, \
               d.attempts, e.event_type, e.payload::text AS payload, o.plan",
        )
        .bind(self.lease_secs)
        .bind(BATCH_SIZE)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| Claimed {
                delivery_id: row.try_get("delivery_id").unwrap_or_default(),
                event_id: row.try_get("event_id").unwrap_or_default(),
                endpoint_id: row.try_get("endpoint_id").unwrap_or_default(),
                organization_id: row.try_get("organization_id").unwrap_or_default(),
                event_type: row.try_get("event_type").unwrap_or_default(),
                payload: row.try_get("payload").unwrap_or_default(),
                plan: row.try_get("plan").unwrap_or_else(|_| "hobby".to_owned()),
                attempts: row.try_get("attempts").unwrap_or_default(),
            })
            .collect())
    }

    /// Pushes next_attempt_at out without touching status or the attempt count.
    async fn reschedule(&self, delivery_id: &str, delay_ms: i64) -> Result<()> {
        sqlx::query(
            "UPDATE delivery SET next_attempt_at = now() + make_interval(secs => $1) WHERE id = $2::uuid",
        )
        .bind(delay_ms as f64 / 1000.0)
        .bind(delivery_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn process(&self, job: &Claimed) -> Result<()> {
        let Some(endpoint) = self.load_endpoint(&job.endpoint_id).await? else {
            // The endpoint is gone or inactive, so stop polling this row.
            self.set_status(&job.delivery_id, "skipped").await?;
            return Ok(());
        };

        if self.circuit_is_open(&endpoint) {
            self.set_status(&job.delivery_id, "circuit_open").await?;
            return Ok(());
        }

        // A throttled delivery is retried without burning an attempt, otherwise a
        // busy tenant would exhaust its own retries while being throttled.
        if !self
            .allow_throughput(&job.organization_id, &job.plan)
            .await?
        {
            return self.reschedule(&job.delivery_id, THROUGHPUT_RETRY_MS).await;
        }

        let attempt_number = job.attempts + 1;

        let outcome = self.send(job, &endpoint).await;
        let is_final = attempt_number >= endpoint.max_attempts;

        match outcome {
            Outcome::Success {
                status,
                duration_ms,
            } => {
                self.record_attempt(
                    job,
                    attempt_number,
                    "success",
                    true,
                    Some(status),
                    None,
                    duration_ms,
                )
                .await?;
                sqlx::query(
                    "UPDATE delivery SET status = 'delivered', attempts = $1, last_attempt_at = now(), \
                     response = $2 WHERE id = $3::uuid",
                )
                .bind(attempt_number)
                .bind(serde_json::json!({ "status": status, "durationMs": duration_ms }))
                .bind(&job.delivery_id)
                .execute(&self.pool)
                .await?;
                self.close_circuit(&job.endpoint_id).await?;
            }
            Outcome::Failure {
                status,
                error,
                duration_ms,
            } => {
                self.record_attempt(
                    job,
                    attempt_number,
                    "failure",
                    is_final,
                    status,
                    Some(&error),
                    duration_ms,
                )
                .await?;
                // Exponential backoff from one second decides when the poll may pick the row up again.
                let backoff_secs = if is_final {
                    0.0
                } else {
                    2i64.pow((attempt_number - 1).clamp(0, 10) as u32) as f64
                };
                sqlx::query(
                    "UPDATE delivery SET status = $1, attempts = $2, last_attempt_at = now(), \
                     response = $3, next_attempt_at = now() + make_interval(secs => $4) WHERE id = $5::uuid",
                )
                .bind(if is_final { "failed" } else { "pending" })
                .bind(attempt_number)
                .bind(serde_json::json!({
                    "status": status, "durationMs": duration_ms, "error": error
                }))
                .bind(backoff_secs)
                .bind(&job.delivery_id)
                .execute(&self.pool)
                .await?;

                self.record_failure(&job.endpoint_id).await?;
            }
        }

        Ok(())
    }

    async fn send(&self, job: &Claimed, endpoint: &Endpoint) -> Outcome {
        let timestamp = chrono::Utc::now().timestamp();
        let signed = format!("{timestamp}.{}", job.payload);
        let signature = sign(&signed, &endpoint.secret);
        let header = match &endpoint.previous_secret {
            Some(previous) if !previous.is_empty() => format!(
                "t={timestamp},v1={signature},v2={}",
                sign(&signed, previous)
            ),
            _ => format!("t={timestamp},v1={signature}"),
        };

        let start = Instant::now();
        let result = self
            .http
            .post(&endpoint.url)
            .header("content-type", "application/json")
            .header("x-von-signature", header)
            .header("x-von-event-type", &job.event_type)
            .header("x-von-delivery-id", &job.delivery_id)
            .header("x-von-event-id", &job.event_id)
            .timeout(Duration::from_millis(endpoint.timeout_ms.max(1) as u64))
            .body(job.payload.clone())
            .send()
            .await;

        let duration_ms = start.elapsed().as_millis() as i64;
        match result {
            Ok(response) if response.status().is_success() => Outcome::Success {
                status: response.status().as_u16(),
                duration_ms,
            },
            Ok(response) => Outcome::Failure {
                status: Some(response.status().as_u16()),
                error: format!("HTTP {}", response.status().as_u16()),
                duration_ms,
            },
            Err(err) => Outcome::Failure {
                status: None,
                error: err.to_string(),
                duration_ms,
            },
        }
    }

    async fn load_endpoint(&self, endpoint_id: &str) -> Result<Option<Endpoint>> {
        let row = sqlx::query(
            "SELECT url, secret, previous_secret, timeout_ms, max_attempts, circuit_state, \
             circuit_opened_at FROM endpoint WHERE id = $1::uuid AND status = 'active' LIMIT 1",
        )
        .bind(endpoint_id)
        .fetch_optional(&self.pool)
        .await?;

        let Some(row) = row else {
            return Ok(None);
        };
        Ok(Some(Endpoint {
            url: row.try_get("url")?,
            secret: von_api::cipher::decrypt_secret(row.try_get("secret")?)?,
            previous_secret: row
                .try_get::<Option<String>, _>("previous_secret")?
                .and_then(|s| von_api::cipher::decrypt_secret(&s).ok()),
            timeout_ms: row.try_get("timeout_ms")?,
            max_attempts: row.try_get("max_attempts")?,
            circuit_state: row.try_get("circuit_state")?,
            circuit_opened_at: row.try_get("circuit_opened_at")?,
        }))
    }

    fn circuit_is_open(&self, endpoint: &Endpoint) -> bool {
        if endpoint.circuit_state != "open" {
            return false;
        }
        // An open circuit becomes eligible for a trial request once the reset
        // window has passed.
        match endpoint.circuit_opened_at {
            Some(opened) => {
                (chrono::Utc::now().naive_utc() - opened).num_seconds() < CIRCUIT_RESET_SECS
            }
            None => true,
        }
    }

    async fn allow_throughput(&self, organization_id: &str, plan: &str) -> Result<bool> {
        let (rate, burst) = if plan == "hobby" {
            (25, 35)
        } else {
            (100, 140)
        };
        let mut conn = self.redis.clone();
        let allowed: i64 = redis::Script::new(THROUGHPUT_SCRIPT)
            .key(format!("org:throughput:{organization_id}"))
            .arg(rate)
            .arg(burst)
            .arg(chrono::Utc::now().timestamp_millis() as f64 / 1000.0)
            .arg(1)
            .invoke_async(&mut conn)
            .await?;
        Ok(allowed == 1)
    }

    #[allow(clippy::too_many_arguments)]
    async fn record_attempt(
        &self,
        job: &Claimed,
        attempt_number: i32,
        outcome: &str,
        is_final: bool,
        http_status: Option<u16>,
        error: Option<&str>,
        duration_ms: i64,
    ) -> Result<()> {
        sqlx::query(
            "INSERT INTO delivery_attempt (id, organization_id, delivery_id, event_id, endpoint_id, \
             attempt_number, outcome, is_final, http_status, error, duration_ms, started_at, finished_at, created_at) \
             VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7, $8, $9, $10, $11, now(), now(), now()) \
             ON CONFLICT (delivery_id, attempt_number) DO NOTHING",
        )
        .bind(uuid::Uuid::new_v4())
        .bind(&job.organization_id)
        .bind(&job.delivery_id)
        .bind(&job.event_id)
        .bind(&job.endpoint_id)
        .bind(attempt_number)
        .bind(outcome)
        .bind(is_final)
        .bind(http_status.map(i32::from))
        .bind(error)
        .bind(duration_ms as i32)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn set_status(&self, delivery_id: &str, status: &str) -> Result<()> {
        sqlx::query("UPDATE delivery SET status = $1 WHERE id = $2::uuid")
            .bind(status)
            .bind(delivery_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Incremented in SQL so two workers failing the same endpoint cannot read
    /// the same count and both write it back.
    async fn record_failure(&self, endpoint_id: &str) -> Result<()> {
        sqlx::query(
            "UPDATE endpoint SET failure_count = failure_count + 1, last_failure_at = now(), \
             circuit_state = CASE WHEN failure_count + 1 >= $2 THEN 'open' ELSE circuit_state END, \
             circuit_opened_at = CASE WHEN failure_count + 1 >= $2 THEN now() ELSE circuit_opened_at END \
             WHERE id = $1::uuid",
        )
        .bind(endpoint_id)
        .bind(CIRCUIT_THRESHOLD)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn close_circuit(&self, endpoint_id: &str) -> Result<()> {
        sqlx::query(
            "UPDATE endpoint SET failure_count = 0, circuit_state = 'closed', \
             circuit_opened_at = NULL, last_success_at = now() WHERE id = $1::uuid",
        )
        .bind(endpoint_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}

fn sign(payload: &str, secret: &str) -> String {
    let Ok(mut mac) = Hmac::<Sha256>::new_from_slice(secret.as_bytes()) else {
        return String::new();
    };
    mac.update(payload.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}
