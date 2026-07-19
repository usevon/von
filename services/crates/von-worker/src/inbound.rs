use hmac::{Hmac, Mac};
use redis::aio::ConnectionManager;
use sha2::Sha256;
use sqlx::{PgPool, Row};
use std::time::{Duration, Instant};
use von_error::Result;
use von_types::{INBOUND_GROUP, INBOUND_STREAM, InboundJob};

pub struct Inbound {
    pool: PgPool,
    redis: ConnectionManager,
    http: reqwest::Client,
    consumer: String,
}

impl Inbound {
    pub async fn new(pool: PgPool, mut redis: ConnectionManager) -> Self {
        let _: redis::RedisResult<()> = redis::cmd("XGROUP")
            .arg("CREATE")
            .arg(INBOUND_STREAM)
            .arg(INBOUND_GROUP)
            .arg("0")
            .arg("MKSTREAM")
            .query_async(&mut redis)
            .await;

        Self {
            pool,
            redis,
            http: reqwest::Client::new(),
            consumer: format!("rust-inbound-{}", &uuid::Uuid::new_v4().to_string()[..8]),
        }
    }

    pub async fn tick(&self) -> Result<usize> {
        let mut conn = self.redis.clone();
        let read: Option<redis::streams::StreamReadReply> = redis::cmd("XREADGROUP")
            .arg("GROUP")
            .arg(INBOUND_GROUP)
            .arg(&self.consumer)
            .arg("COUNT")
            .arg(64)
            .arg("STREAMS")
            .arg(INBOUND_STREAM)
            .arg(">")
            .query_async(&mut conn)
            .await?;

        let entries = read.map(crate::flusher::entries_of).unwrap_or_default();
        let count = entries.len();

        for (stream_id, payload) in entries {
            if let Ok(job) = serde_json::from_str::<InboundJob>(&payload)
                && let Err(err) = self.forward(&job).await
            {
                eprintln!("inbound {} failed: {err}", job.delivery_id);
            }
            let _: redis::RedisResult<()> = redis::pipe()
                .cmd("XACK")
                .arg(INBOUND_STREAM)
                .arg(INBOUND_GROUP)
                .arg(&stream_id)
                .ignore()
                .cmd("XDEL")
                .arg(INBOUND_STREAM)
                .arg(&stream_id)
                .ignore()
                .query_async(&mut conn)
                .await;
        }

        Ok(count)
    }

    async fn forward(&self, job: &InboundJob) -> Result<()> {
        let row = sqlx::query(
            "SELECT forward_url, secret, timeout_ms FROM inbound_endpoint \
             WHERE id = $1::uuid AND status = 'active' LIMIT 1",
        )
        .bind(&job.endpoint_id)
        .fetch_optional(&self.pool)
        .await?;

        let Some(row) = row else {
            return Ok(());
        };
        let url: String = row.try_get("forward_url")?;
        let secret = von_api::cipher::decrypt_secret(row.try_get("secret")?)?;
        let timeout_ms: i32 = row.try_get("timeout_ms")?;

        let timestamp = chrono::Utc::now().timestamp();
        let signature = {
            let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes())
                .map_err(|_| von_error::Error::Configuration("bad secret".to_owned()))?;
            mac.update(format!("{timestamp}.{}", job.payload).as_bytes());
            hex::encode(mac.finalize().into_bytes())
        };

        let start = Instant::now();
        let result = self
            .http
            .post(&url)
            .header("content-type", "application/json")
            .header("x-von-signature", format!("t={timestamp},v1={signature}"))
            .header("x-von-inbound-delivery-id", &job.delivery_id)
            .timeout(Duration::from_millis(timeout_ms.max(1) as u64))
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
