use redis::aio::ConnectionManager;
use sqlx::PgPool;
use std::collections::HashMap;
use von_error::Result;
use von_types::{
    BufferedDelivery, BufferedEntry, BufferedEvent, DELIVERY_STREAM, DeliveryJob, FLUSHER_GROUP,
    STREAM_KEY,
};

const BATCH_SIZE: usize = 500;

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

    /// Returns how many events were persisted so the caller can back off when idle.
    pub async fn tick(&self) -> Result<usize> {
        let mut conn = self.redis.clone();

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

        let entries = read.map(entries_of).unwrap_or_default();
        if entries.is_empty() {
            return Ok(0);
        }

        let mut stream_ids = Vec::with_capacity(entries.len());
        let mut events: Vec<BufferedEvent> = Vec::new();
        let mut deliveries: Vec<BufferedDelivery> = Vec::new();
        let mut plan_by_delivery: HashMap<String, String> = HashMap::new();

        for (id, payload) in entries {
            stream_ids.push(id);
            let Ok(entry) = serde_json::from_str::<BufferedEntry>(&payload) else {
                continue;
            };
            for delivery in &entry.deliveries {
                plan_by_delivery.insert(delivery.id.clone(), entry.plan.clone());
            }
            events.extend(entry.events);
            deliveries.extend(entry.deliveries);
        }

        let persisted = if events.is_empty() {
            true
        } else {
            match self.persist(&events, &deliveries).await {
                Ok(inserted) => {
                    self.enqueue(&events, &deliveries, &inserted, &plan_by_delivery)
                        .await?;
                    true
                }
                Err(err) => {
                    eprintln!(
                        "flush failed, leaving {} entries pending: {err}",
                        stream_ids.len()
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

    /// Returns the ids that actually landed, which is a subset when an idempotency
    /// key collides with an event that was already stored.
    async fn persist(
        &self,
        events: &[BufferedEvent],
        deliveries: &[BufferedDelivery],
    ) -> Result<Vec<String>> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("SET LOCAL synchronous_commit = off")
            .execute(&mut *tx)
            .await?;

        let ids: Vec<uuid::Uuid> = events
            .iter()
            .filter_map(|e| uuid::Uuid::parse_str(&e.id).ok())
            .collect();
        let org_ids: Vec<uuid::Uuid> = events
            .iter()
            .filter_map(|e| uuid::Uuid::parse_str(&e.organization_id).ok())
            .collect();
        let types: Vec<String> = events.iter().map(|e| e.event_type.clone()).collect();
        let payloads: Vec<serde_json::Value> = events
            .iter()
            .map(|e| serde_json::from_str(e.payload.get()).unwrap_or(serde_json::Value::Null))
            .collect();
        let keys: Vec<Option<String>> = events.iter().map(|e| e.idempotency_key.clone()).collect();
        let created: Vec<chrono::NaiveDateTime> =
            events.iter().map(|e| parse_iso(&e.created_at)).collect();

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
        let to_insert: Vec<&BufferedDelivery> = deliveries
            .iter()
            .filter(|d| landed.contains(d.event_id.as_str()))
            .collect();

        if !to_insert.is_empty() {
            let d_ids: Vec<uuid::Uuid> = to_insert
                .iter()
                .filter_map(|d| uuid::Uuid::parse_str(&d.id).ok())
                .collect();
            let d_orgs: Vec<uuid::Uuid> = to_insert
                .iter()
                .filter_map(|d| uuid::Uuid::parse_str(&d.organization_id).ok())
                .collect();
            let d_events: Vec<uuid::Uuid> = to_insert
                .iter()
                .filter_map(|d| uuid::Uuid::parse_str(&d.event_id).ok())
                .collect();
            let d_endpoints: Vec<uuid::Uuid> = to_insert
                .iter()
                .filter_map(|d| uuid::Uuid::parse_str(&d.endpoint_id).ok())
                .collect();
            let d_status: Vec<String> = to_insert.iter().map(|d| d.status.clone()).collect();
            let d_attempts: Vec<i32> = to_insert.iter().map(|d| d.attempts as i32).collect();
            let d_created: Vec<chrono::NaiveDateTime> =
                to_insert.iter().map(|d| parse_iso(&d.created_at)).collect();

            sqlx::query(
                "INSERT INTO delivery (id, organization_id, event_id, endpoint_id, status, attempts, created_at) \
                 SELECT * FROM UNNEST($1::uuid[], $2::uuid[], $3::uuid[], $4::uuid[], $5::text[], $6::int[], $7::timestamp[])",
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
        Ok(inserted)
    }

    /// Enqueued only after the rows exist so a worker cannot pick up a delivery
    /// whose event has not been committed.
    async fn enqueue(
        &self,
        events: &[BufferedEvent],
        deliveries: &[BufferedDelivery],
        inserted: &[String],
        plans: &HashMap<String, String>,
    ) -> Result<()> {
        let landed: std::collections::HashSet<&str> = inserted.iter().map(String::as_str).collect();
        let by_id: HashMap<&str, &BufferedEvent> =
            events.iter().map(|e| (e.id.as_str(), e)).collect();

        let mut pipe = redis::pipe();
        let mut queued = 0;
        for delivery in deliveries {
            if !landed.contains(delivery.event_id.as_str()) {
                continue;
            }
            let Some(event) = by_id.get(delivery.event_id.as_str()) else {
                continue;
            };

            let job = DeliveryJob {
                delivery_id: delivery.id.clone(),
                event_id: delivery.event_id.clone(),
                endpoint_id: delivery.endpoint_id.clone(),
                organization_id: delivery.organization_id.clone(),
                event_type: event.event_type.clone(),
                payload: event.payload.get().to_owned(),
                plan: plans
                    .get(&delivery.id)
                    .cloned()
                    .unwrap_or_else(|| "hobby".to_owned()),
            };
            let Ok(encoded) = serde_json::to_string(&job) else {
                continue;
            };
            pipe.cmd("XADD")
                .arg(DELIVERY_STREAM)
                .arg("*")
                .arg("data")
                .arg(encoded)
                .ignore();
            queued += 1;
        }

        if queued > 0 {
            let mut conn = self.redis.clone();
            pipe.query_async::<()>(&mut conn).await?;
        }
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
