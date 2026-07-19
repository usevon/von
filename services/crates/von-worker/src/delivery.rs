use hmac::{Hmac, Mac};
use redis::aio::ConnectionManager;
use sha2::Sha256;
use sqlx::{PgPool, Row};
use std::time::{Duration, Instant};
use von_error::Result;
use von_types::{DELIVERY_DELAYED, DELIVERY_GROUP, DELIVERY_STREAM, DeliveryJob};

const CIRCUIT_THRESHOLD: i32 = 5;
const CIRCUIT_RESET_SECS: i64 = 300;
const THROUGHPUT_RETRY_MS: i64 = 1000;

/// Token bucket shared with the typescript worker so both throttle one tenant
/// against the same counter during the migration.
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
    consumer: String,
    throughput_sha: String,
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
    pub async fn new(pool: PgPool, mut redis: ConnectionManager) -> Result<Self> {
        let _: redis::RedisResult<()> = redis::cmd("XGROUP")
            .arg("CREATE")
            .arg(DELIVERY_STREAM)
            .arg(DELIVERY_GROUP)
            .arg("0")
            .arg("MKSTREAM")
            .query_async(&mut redis)
            .await;

        let throughput_sha: String = redis::cmd("SCRIPT")
            .arg("LOAD")
            .arg(THROUGHPUT_SCRIPT)
            .query_async(&mut redis)
            .await?;

        Ok(Self {
            pool,
            redis,
            http: reqwest::Client::builder()
                .redirect(reqwest::redirect::Policy::none())
                .build()
                .unwrap_or_default(),
            consumer: format!("rust-worker-{}", &uuid::Uuid::new_v4().to_string()[..8]),
            throughput_sha,
        })
    }

    pub async fn tick(&self) -> Result<usize> {
        self.promote_due().await?;

        let mut conn = self.redis.clone();
        let read: Option<redis::streams::StreamReadReply> = redis::cmd("XREADGROUP")
            .arg("GROUP")
            .arg(DELIVERY_GROUP)
            .arg(&self.consumer)
            .arg("COUNT")
            .arg(64)
            .arg("STREAMS")
            .arg(DELIVERY_STREAM)
            .arg(">")
            .query_async(&mut conn)
            .await?;

        let entries = read.map(crate::flusher::entries_of).unwrap_or_default();
        let count = entries.len();

        for (stream_id, payload) in entries {
            if let Ok(job) = serde_json::from_str::<DeliveryJob>(&payload) {
                if let Err(err) = self.process(&job).await {
                    eprintln!("delivery {} failed: {err}", job.delivery_id);
                }
            }
            let _: redis::RedisResult<()> = redis::pipe()
                .cmd("XACK")
                .arg(DELIVERY_STREAM)
                .arg(DELIVERY_GROUP)
                .arg(&stream_id)
                .ignore()
                .cmd("XDEL")
                .arg(DELIVERY_STREAM)
                .arg(&stream_id)
                .ignore()
                .query_async(&mut conn)
                .await;
        }

        Ok(count)
    }

    /// Retries live in a sorted set keyed by due time, which the stream itself
    /// cannot express.
    async fn promote_due(&self) -> Result<()> {
        let mut conn = self.redis.clone();
        let now = chrono::Utc::now().timestamp_millis();
        let due: Vec<String> = redis::cmd("ZRANGEBYSCORE")
            .arg(DELIVERY_DELAYED)
            .arg(0)
            .arg(now)
            .arg("LIMIT")
            .arg(0)
            .arg(100)
            .query_async(&mut conn)
            .await?;

        for payload in due {
            let removed: i64 = redis::cmd("ZREM")
                .arg(DELIVERY_DELAYED)
                .arg(&payload)
                .query_async(&mut conn)
                .await?;
            // Another worker may have promoted the same entry first.
            if removed == 0 {
                continue;
            }
            let _: redis::RedisResult<()> = redis::cmd("XADD")
                .arg(DELIVERY_STREAM)
                .arg("*")
                .arg("data")
                .arg(&payload)
                .query_async(&mut conn)
                .await;
        }
        Ok(())
    }

    async fn delay(&self, job: &DeliveryJob, delay_ms: i64) -> Result<()> {
        let mut conn = self.redis.clone();
        let payload = serde_json::to_string(job).unwrap_or_default();
        let due = chrono::Utc::now().timestamp_millis() + delay_ms;
        let _: redis::RedisResult<()> = redis::cmd("ZADD")
            .arg(DELIVERY_DELAYED)
            .arg(due)
            .arg(payload)
            .query_async(&mut conn)
            .await;
        Ok(())
    }

    async fn process(&self, job: &DeliveryJob) -> Result<()> {
        let Some(endpoint) = self.load_endpoint(&job.endpoint_id).await? else {
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
            return self.delay(job, THROUGHPUT_RETRY_MS).await;
        }

        // The attempt number comes from the row rather than the queue so a
        // requeue cannot reset the count.
        let attempts: i32 = sqlx::query_scalar("SELECT attempts FROM delivery WHERE id = $1::uuid")
            .bind(&job.delivery_id)
            .fetch_optional(&self.pool)
            .await?
            .unwrap_or(0);
        let attempt_number = attempts + 1;

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
                    "UPDATE delivery SET status = 'success', attempts = $1, last_attempt_at = now(), \
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
                sqlx::query(
                    "UPDATE delivery SET status = $1, attempts = $2, last_attempt_at = now(), \
                     response = $3 WHERE id = $4::uuid",
                )
                .bind(if is_final { "failed" } else { "pending" })
                .bind(attempt_number)
                .bind(serde_json::json!({
                    "status": status, "durationMs": duration_ms, "error": error
                }))
                .bind(&job.delivery_id)
                .execute(&self.pool)
                .await?;

                self.record_failure(&job.endpoint_id).await?;

                if !is_final {
                    // Exponential backoff from one second, matching the queue's
                    // previous retry curve.
                    let backoff = 1000i64 * 2i64.pow((attempt_number - 1).clamp(0, 10) as u32);
                    self.delay(job, backoff).await?;
                }
            }
        }

        Ok(())
    }

    async fn send(&self, job: &DeliveryJob, endpoint: &Endpoint) -> Outcome {
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
        let allowed: i64 = redis::cmd("EVALSHA")
            .arg(&self.throughput_sha)
            .arg(1)
            .arg(format!("org:throughput:{organization_id}"))
            .arg(rate)
            .arg(burst)
            .arg(chrono::Utc::now().timestamp_millis() as f64 / 1000.0)
            .arg(1)
            .query_async(&mut conn)
            .await?;
        Ok(allowed == 1)
    }

    #[allow(clippy::too_many_arguments)]
    async fn record_attempt(
        &self,
        job: &DeliveryJob,
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
