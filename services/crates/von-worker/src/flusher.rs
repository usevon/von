use redis::aio::ConnectionManager;
use sqlx::PgPool;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use von_error::Result;
use von_types::{
    BufferedDelivery, BufferedEvent, ENTRY_FIELD_PLAIN, ENTRY_FIELD_ZSTD, FLUSHER_GROUP,
    STREAM_KEY, decode_entry,
};

const BATCH_SIZE: usize = 500;
const RECLAIM_IDLE_MS: usize = 30_000;

/// Reclaiming is a recovery path for crashed consumers, it does not need a round trip per tick.
const RECLAIM_EVERY: Duration = Duration::from_secs(5);

/// The read blocks briefly so an idle flusher neither polls nor adds latency to new events.
const READ_BLOCK_MS: usize = 100;

pub struct Flusher {
    pool: PgPool,
    redis: ConnectionManager,
    consumer: String,
    last_reclaim: Mutex<Instant>,
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
            last_reclaim: Mutex::new(Instant::now() - RECLAIM_EVERY),
        }
    }

    /// Drains one batch of buffered events into Postgres, the returned count lets an idle caller back off.
    pub async fn tick(&self) -> Result<usize> {
        let mut conn = self.redis.clone();

        let mut entries = if self.reclaim_due() {
            self.reclaim(&mut conn).await
        } else {
            Vec::new()
        };

        // Blocking briefly is only correct when nothing is already waiting to be processed.
        let mut read_cmd = redis::cmd("XREADGROUP");
        read_cmd
            .arg("GROUP")
            .arg(FLUSHER_GROUP)
            .arg(&self.consumer)
            .arg("COUNT")
            .arg(BATCH_SIZE);
        if entries.is_empty() {
            read_cmd.arg("BLOCK").arg(READ_BLOCK_MS);
        }
        read_cmd.arg("STREAMS").arg(STREAM_KEY).arg(">");
        let read: Option<redis::streams::StreamReadReply> = read_cmd.query_async(&mut conn).await?;

        if let Some(read) = read {
            entries.extend(entries_of(read));
        }
        if entries.is_empty() {
            return Ok(0);
        }

        let mut stream_ids = Vec::with_capacity(entries.len());
        let mut events: Vec<BufferedEvent> = Vec::new();
        let mut deliveries: Vec<BufferedDelivery> = Vec::new();

        for (id, field, payload) in entries {
            match decode_entry(field, &payload) {
                Ok(entry) => {
                    events.extend(entry.events);
                    deliveries.extend(entry.deliveries);
                }
                // A malformed entry is acked anyway, retrying it can never succeed and
                // leaving it pending would wedge the reclaim path forever.
                Err(err) => {
                    tracing::error!(stream_id = %id, error = %err, "dropping undecodable entry")
                }
            }
            stream_ids.push(id);
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
            let mut pipe = redis::pipe();
            {
                let ack = pipe.cmd("XACK").arg(STREAM_KEY).arg(FLUSHER_GROUP);
                for id in &stream_ids {
                    ack.arg(id);
                }
                ack.ignore();
            }
            {
                let del = pipe.cmd("XDEL").arg(STREAM_KEY);
                for id in &stream_ids {
                    del.arg(id);
                }
                del.ignore();
            }
            let _: redis::RedisResult<()> = pipe.query_async(&mut conn).await;
        }

        Ok(events.len())
    }

    fn reclaim_due(&self) -> bool {
        let mut last = self.last_reclaim.lock().unwrap_or_else(|e| e.into_inner());
        if last.elapsed() < RECLAIM_EVERY {
            return false;
        }
        *last = Instant::now();
        true
    }

    /// Claims entries a crashed flusher left pending so a Postgres blip does not strand events.
    async fn reclaim(&self, conn: &mut ConnectionManager) -> Vec<(String, &'static str, Vec<u8>)> {
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
                .filter_map(|entry| {
                    let (field, bytes) = entry_bytes(&entry)?;
                    Some((entry.id.clone(), field, bytes))
                })
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
            // The payload was validated as JSON at ingest, binding it as text and casting
            // in SQL skips a full parse and re-serialize per event.
            payloads.push(e.payload.get().to_owned());
            keys.push(e.idempotency_key.clone());
            created.push(parse_iso(&e.created_at));
        }

        // A parent row deleted mid-flight would poison the whole batch on its FK forever,
        // so rows whose organization vanished are dropped instead of retried.
        let inserted: Vec<String> = sqlx::query_scalar(
            "INSERT INTO event (id, organization_id, event_type, payload, idempotency_key, created_at) \
             SELECT t.id, t.organization_id, t.event_type, t.payload::jsonb, t.idempotency_key, t.created_at \
             FROM UNNEST($1::uuid[], $2::uuid[], $3::text[], $4::text[], $5::text[], $6::timestamptz[]) \
             AS t(id, organization_id, event_type, payload, idempotency_key, created_at) \
             WHERE EXISTS (SELECT 1 FROM organization o WHERE o.id = t.organization_id) \
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
            // ON CONFLICT keeps a reclaimed batch idempotent when its event rows already committed,
            // and the EXISTS drops deliveries whose endpoint was deleted while they sat in the buffer.
            sqlx::query(
                "INSERT INTO delivery (id, organization_id, event_id, endpoint_id, status, attempts, created_at) \
                 SELECT t.* FROM UNNEST($1::uuid[], $2::uuid[], $3::uuid[], $4::uuid[], $5::text[], $6::int[], $7::timestamptz[]) \
                 AS t(id, organization_id, event_id, endpoint_id, status, attempts, created_at) \
                 WHERE EXISTS (SELECT 1 FROM endpoint e WHERE e.id = t.endpoint_id) \
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

fn parse_iso(value: &str) -> chrono::DateTime<chrono::Utc> {
    chrono::DateTime::parse_from_rfc3339(value)
        .map(|d| d.with_timezone(&chrono::Utc))
        .unwrap_or_else(|_| chrono::Utc::now())
}

fn entry_bytes(entry: &redis::streams::StreamId) -> Option<(&'static str, Vec<u8>)> {
    if let Some(z) = entry.get::<Vec<u8>>(ENTRY_FIELD_ZSTD) {
        return Some((ENTRY_FIELD_ZSTD, z));
    }
    entry
        .get::<Vec<u8>>(ENTRY_FIELD_PLAIN)
        .map(|d| (ENTRY_FIELD_PLAIN, d))
}

pub fn entries_of(reply: redis::streams::StreamReadReply) -> Vec<(String, &'static str, Vec<u8>)> {
    reply
        .keys
        .into_iter()
        .flat_map(|key| key.ids)
        .filter_map(|entry| {
            let (field, bytes) = entry_bytes(&entry)?;
            Some((entry.id, field, bytes))
        })
        .collect()
}
