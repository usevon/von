use futures_util::stream::{self, StreamExt};
use sqlx::{PgPool, Row};
use std::time::{Duration, Instant};
use tracing::error;
use von_error::Result;

use crate::common::{concurrency, lease_secs, sign};

const BATCH_SIZE: i64 = 64;

struct Claimed {
    delivery_id: String,
    endpoint_id: String,
    payload: String,
}

struct Endpoint {
    forward_url: String,
    secret: String,
    timeout_ms: i32,
}

pub struct Inbound {
    pool: PgPool,
    http: reqwest::Client,
    concurrency: usize,
    lease_secs: f64,
}

impl Inbound {
    pub async fn new(pool: PgPool) -> Self {
        Self {
            pool,
            // Redirect following would let a forward_url bounce to an internal address.
            http: reqwest::Client::builder()
                .redirect(reqwest::redirect::Policy::none())
                .build()
                .expect("reqwest client build"),
            concurrency: concurrency(),
            lease_secs: lease_secs(),
        }
    }

    pub async fn tick(&self) -> Result<usize> {
        let claimed = self.claim().await?;
        let count = claimed.len();

        stream::iter(claimed)
            .for_each_concurrent(self.concurrency, |job| async move {
                if let Err(err) = self.forward(&job).await {
                    // The lease re-exposes the row once it expires, so nothing is dropped.
                    error!(delivery_id = %job.delivery_id, error = %err, "inbound forward failed");
                }
            })
            .await;

        Ok(count)
    }

    /// Claims due inbound deliveries with SKIP LOCKED, pushing next_attempt_at out by the lease.
    async fn claim(&self) -> Result<Vec<Claimed>> {
        let rows = sqlx::query(
            "WITH claimed AS ( \
               SELECT id FROM inbound_delivery \
               WHERE status = 'pending' AND next_attempt_at <= now() \
               ORDER BY next_attempt_at \
               FOR UPDATE SKIP LOCKED \
               LIMIT $2 \
             ) \
             UPDATE inbound_delivery d \
             SET next_attempt_at = now() + make_interval(secs => $1) \
             FROM claimed c \
             WHERE d.id = c.id \
             RETURNING d.id::text AS delivery_id, \
               d.inbound_endpoint_id::text AS endpoint_id, d.payload::text AS payload",
        )
        .bind(self.lease_secs)
        .bind(BATCH_SIZE)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .filter_map(|row| {
                Some(Claimed {
                    delivery_id: row.try_get("delivery_id").ok()?,
                    endpoint_id: row.try_get("endpoint_id").ok()?,
                    payload: row.try_get("payload").ok()?,
                })
            })
            .collect())
    }

    async fn load_endpoint(&self, endpoint_id: &str) -> Result<Option<Endpoint>> {
        let row = sqlx::query(
            "SELECT forward_url, secret, timeout_ms FROM inbound_endpoint \
             WHERE id = $1::uuid AND status = 'active' LIMIT 1",
        )
        .bind(endpoint_id)
        .fetch_optional(&self.pool)
        .await?;

        let Some(row) = row else {
            return Ok(None);
        };
        Ok(Some(Endpoint {
            forward_url: row.try_get("forward_url")?,
            secret: von_api::cipher::decrypt_secret(row.try_get("secret")?)?,
            timeout_ms: row.try_get("timeout_ms")?,
        }))
    }

    async fn set_status(&self, delivery_id: &str, status: &str) -> Result<()> {
        sqlx::query("UPDATE inbound_delivery SET status = $1 WHERE id = $2::uuid")
            .bind(status)
            .bind(delivery_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn forward(&self, job: &Claimed) -> Result<()> {
        let Some(endpoint) = self.load_endpoint(&job.endpoint_id).await? else {
            // The endpoint is gone or no longer active, so stop polling this row.
            self.set_status(&job.delivery_id, "skipped").await?;
            return Ok(());
        };

        let timestamp = chrono::Utc::now().timestamp();
        let signature = sign(&format!("{timestamp}.{}", job.payload), &endpoint.secret);

        let start = Instant::now();
        let result = self
            .http
            .post(&endpoint.forward_url)
            .header("content-type", "application/json")
            .header("x-von-signature", format!("t={timestamp},v1={signature}"))
            .header("x-von-inbound-delivery-id", &job.delivery_id)
            .timeout(Duration::from_millis(endpoint.timeout_ms.max(1) as u64))
            .body(job.payload.clone())
            .send()
            .await;
        let duration_ms = start.elapsed().as_millis() as i64;

        let (status, response) = match result {
            Ok(res) if res.status().is_success() => (
                "forwarded",
                serde_json::json!({ "status": res.status().as_u16(), "durationMs": duration_ms }),
            ),
            Ok(res) => (
                "failed",
                serde_json::json!({
                    "status": res.status().as_u16(), "durationMs": duration_ms,
                    "error": format!("HTTP {}", res.status().as_u16())
                }),
            ),
            Err(err) => (
                "failed",
                serde_json::json!({ "durationMs": duration_ms, "error": err.to_string() }),
            ),
        };

        sqlx::query(
            "UPDATE inbound_delivery SET status = $1, response = $2, \
             forwarded_at = CASE WHEN $1 = 'forwarded' THEN now() ELSE forwarded_at END \
             WHERE id = $3::uuid",
        )
        .bind(status)
        .bind(response)
        .bind(&job.delivery_id)
        .execute(&self.pool)
        .await?;

        if status == "forwarded" {
            sqlx::query("UPDATE inbound_endpoint SET last_success_at = now() WHERE id = $1::uuid")
                .bind(&job.endpoint_id)
                .execute(&self.pool)
                .await?;
        }

        Ok(())
    }
}
