use redis::aio::ConnectionManager;
use sqlx::PgPool;
use von_error::Result;
use von_types::{BufferedDelivery, BufferedEntry, BufferedEvent, FLUSHER_GROUP, STREAM_KEY};

const BATCH_SIZE: usize = 500;
const RECLAIM_IDLE_MS: usize = 30_000;

pub struct Flusher {
    pool: PgPool,
    redis: ConnectionManager,
    consumer: String,
}

impl Flusher {
    pub async fn new(pool: PgPool, mut redis: ConnectionManager) -> Self {
        let _: redis::RedisResult<()> = redis::cmd("XGROUP")
            .arg("CREATE")
            .arg(STREAM_KEY)
            .arg(FLUSHER_GROUP)
            .arg("0")
            .arg("MKSTREAM")
            .query_async(&mut redis)
            .await;

        Self {
            pool,
            redis,
            consumer: format!("rust-flusher-{}", &uuid::Uuid::new_v4().to_string()[..8]),
        }
    }

    /// Drains one batch of buffered events into Postgres, the returned count lets an idle caller back off.
    pub async fn tick(&self) -> Result<usize> {
        let mut conn = self.redis.clone();

        // A batch whose persist failed stays pending, so reclaim it before reading new entries.
        let mut entries = self.reclaim(&mut conn).await;

        let read: Option<redis::streams::StreamReadReply> = redis::cmd("XREADGROUP")
            .arg("GROUP")
            .arg(FLUSHER_GROUP)
            .arg(&self.consumer)
            .arg("COUNT")
            .arg(BATCH_SIZE)
            .arg("STREAMS")
            .arg(STREAM_KEY)
            .arg(">")
            .query_async(&mut conn)
            .await?;

        if let Some(read) = read {
            entries.extend(entries_of(read));
        }
        if entries.is_empty() {
            return Ok(0);
        }

        let mut stream_ids = Vec::with_capacity(entries.len());
        let mut events: Vec<BufferedEvent> = Vec::new();
        let mut deliveries: Vec<BufferedDelivery> = Vec::new();

        for (id, payload) in entries {
            stream_ids.push(id);
            let Ok(entry) = serde_json::from_str::<BufferedEntry>(&payload) else {
                continue;
            };
            events.extend(entry.events);
            deliveries.extend(entry.deliveries);
        }

        // Persisting the pending delivery rows is the enqueue, the worker polls them from Postgres.
        let persisted = if events.is_empty() {
            true
        } else {
            match self.persist(&events, &deliveries).await {
                Ok(_) => true,
                Err(err) => {
                    tracing::error!(
                        error = %err,
                        entries = stream_ids.len(),
                        "flush failed, leaving entries pending"
                    );
                    false
                }
            }
        };

        // Entries stay pending when persistence failed so a later read retries them
        // instead of acknowledging events that were never written.
        if persisted && !stream_ids.is_empty() {
            let mut ack = redis::cmd("XACK");
            ack.arg(STREAM_KEY).arg(FLUSHER_GROUP);
            let mut del = redis::cmd("XDEL");
            del.arg(STREAM_KEY);
            for id in &stream_ids {
                ack.arg(id);
                del.arg(id);
            }
            let _: redis::RedisResult<()> = ack.query_async(&mut conn).await;
            let _: redis::RedisResult<()> = del.query_async(&mut conn).await;
        }

        Ok(events.len())
    }

    /// Claims entries a crashed flusher left pending so a Postgres blip does not strand events.
    async fn reclaim(&self, conn: &mut ConnectionManager) -> Vec<(String, String)> {
        let reply: redis::RedisResult<redis::streams::StreamAutoClaimReply> =
            redis::cmd("XAUTOCLAIM")
                .arg(STREAM_KEY)
                .arg(FLUSHER_GROUP)
                .arg(&self.consumer)
                .arg(RECLAIM_IDLE_MS)
                .arg("0")
                .arg("COUNT")
                .arg(BATCH_SIZE)
                .query_async(conn)
                .await;

        match reply {
            Ok(reply) => reply
                .claimed
                .into_iter()
                .filter_map(|entry| Some((entry.id.clone(), entry.get::<String>("data")?)))
                .collect(),
            Err(_) => Vec::new(),
        }
    }

    /// Persists events and their deliveries in one transaction, dropping deliveries whose event was deduped by an idempotency key.
    async fn persist(
        &self,
        events: &[BufferedEvent],
        deliveries: &[BufferedDelivery],
    ) -> Result<()> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("SET LOCAL synchronous_commit = off")
            .execute(&mut *tx)
            .await?;

        // One pass so every column array stays index aligned, a single bad id would otherwise
        // shift the rest onto the wrong org and payload.
        let mut ids = Vec::with_capacity(events.len());
        let mut org_ids = Vec::with_capacity(events.len());
        let mut types = Vec::with_capacity(events.len());
        let mut payloads = Vec::with_capacity(events.len());
        let mut keys = Vec::with_capacity(events.len());
        let mut created = Vec::with_capacity(events.len());
        for e in events {
            let (Ok(id), Ok(org)) = (
                uuid::Uuid::parse_str(&e.id),
                uuid::Uuid::parse_str(&e.organization_id),
            ) else {
                continue;
            };
            ids.push(id);
            org_ids.push(org);
            types.push(e.event_type.clone());
            payloads.push(serde_json::from_str(e.payload.get()).unwrap_or(serde_json::Value::Null));
            keys.push(e.idempotency_key.clone());
            created.push(parse_iso(&e.created_at));
        }

        let inserted: Vec<String> = sqlx::query_scalar(
            "INSERT INTO event (id, organization_id, event_type, payload, idempotency_key, created_at) \
             SELECT * FROM UNNEST($1::uuid[], $2::uuid[], $3::text[], $4::jsonb[], $5::text[], $6::timestamp[]) \
             ON CONFLICT (organization_id, idempotency_key) DO NOTHING \
             RETURNING id::text",
        )
        .bind(&ids)
        .bind(&org_ids)
        .bind(&types)
        .bind(&payloads)
        .bind(&keys)
        .bind(&created)
        .fetch_all(&mut *tx)
        .await?;

        let landed: std::collections::HashSet<&str> = inserted.iter().map(String::as_str).collect();

        let mut d_ids = Vec::new();
        let mut d_orgs = Vec::new();
        let mut d_events = Vec::new();
        let mut d_endpoints = Vec::new();
        let mut d_status = Vec::new();
        let mut d_attempts = Vec::new();
        let mut d_created = Vec::new();
        for d in deliveries {
            if !landed.contains(d.event_id.as_str()) {
                continue;
            }
            let (Ok(id), Ok(org), Ok(event_id), Ok(endpoint_id)) = (
                uuid::Uuid::parse_str(&d.id),
                uuid::Uuid::parse_str(&d.organization_id),
                uuid::Uuid::parse_str(&d.event_id),
                uuid::Uuid::parse_str(&d.endpoint_id),
            ) else {
                continue;
            };
            d_ids.push(id);
            d_orgs.push(org);
            d_events.push(event_id);
            d_endpoints.push(endpoint_id);
            d_status.push(d.status.clone());
            d_attempts.push(d.attempts as i32);
            d_created.push(parse_iso(&d.created_at));
        }

        if !d_ids.is_empty() {
            // ON CONFLICT keeps a reclaimed batch idempotent when its event rows already committed.
            sqlx::query(
                "INSERT INTO delivery (id, organization_id, event_id, endpoint_id, status, attempts, created_at) \
                 SELECT * FROM UNNEST($1::uuid[], $2::uuid[], $3::uuid[], $4::uuid[], $5::text[], $6::int[], $7::timestamp[]) \
                 ON CONFLICT (id) DO NOTHING",
            )
            .bind(&d_ids)
            .bind(&d_orgs)
            .bind(&d_events)
            .bind(&d_endpoints)
            .bind(&d_status)
            .bind(&d_attempts)
            .bind(&d_created)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;
        Ok(())
    }
}

fn parse_iso(value: &str) -> chrono::NaiveDateTime {
    chrono::DateTime::parse_from_rfc3339(value)
        .map(|d| d.naive_utc())
        .unwrap_or_else(|_| chrono::Utc::now().naive_utc())
}

pub fn entries_of(reply: redis::streams::StreamReadReply) -> Vec<(String, String)> {
    reply
        .keys
        .into_iter()
        .flat_map(|key| key.ids)
        .filter_map(|entry| {
            let payload: String = entry.get("data")?;
            Some((entry.id, payload))
        })
        .collect()
}
