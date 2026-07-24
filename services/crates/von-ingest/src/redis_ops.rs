use crate::coalesce::{FlushJob, MAX_INFLIGHT_PIPELINES};
use redis::aio::ConnectionManager;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use von_error::{Error, Result};
use von_types::{
    BufferedDelivery, BufferedEntry, BufferedEvent, CreatedEvent, QUOTA_TTL, STREAM_KEY,
    encode_entry, matches_event_type, quota_key, rate_key,
};

const RESERVE_AND_BUFFER: &str = r#"
local quota_key = KEYS[1]
local rate_key = KEYS[2]
local limit = tonumber(ARGV[1])
local requested = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
local has_overage = tonumber(ARGV[4])
local stream_key = ARGV[5]
local payload = ARGV[6]
local rate_max = tonumber(ARGV[7])
local rate_window = tonumber(ARGV[8])
local rate_cost = tonumber(ARGV[9])
local field = ARGV[10]

if rate_max > 0 then
  local used = tonumber(redis.call('GET', rate_key) or '0')
  -- Rejected events must not consume the window, and a batch already under the
  -- ceiling is allowed through whole so one large batch is never unsendable.
  if used >= rate_max then
    return {-1, 0, ''}
  end
  local total = redis.call('INCRBY', rate_key, rate_cost)
  if total == rate_cost then
    redis.call('EXPIRE', rate_key, rate_window)
  end
end

local current = tonumber(redis.call('GET', quota_key) or '0')

if has_overage == 0 and current + requested > limit then
  return {0, current, ''}
end

local new_val = redis.call('INCRBY', quota_key, requested)
redis.call('EXPIRE', quota_key, ttl)

-- No MAXLEN trim here, discarding unflushed entries would silently drop acknowledged
-- events, so a full buffer surfaces as Redis OOM and ingest backpressures instead.
local stream_id = redis.call('XADD', stream_key, '*', field, payload)

return {1, new_val, stream_id}
"#;

/// Throughput is a per second ceiling, so the counter window matches.
const RATE_WINDOW_SECS: i64 = 1;

/// Holds one connection per in-flight pipeline so a large batch on one socket
/// cannot head-of-line block every other tenant's flush.
#[derive(Clone)]
pub struct RedisOps {
    conns: Arc<Vec<ConnectionManager>>,
    next: Arc<AtomicUsize>,
    sha: Arc<str>,
}

impl RedisOps {
    pub async fn new(client: redis::Client) -> Result<Self> {
        let mut conns = Vec::with_capacity(MAX_INFLIGHT_PIPELINES);
        for _ in 0..MAX_INFLIGHT_PIPELINES {
            conns.push(ConnectionManager::new(client.clone()).await?);
        }
        let sha: String = redis::cmd("SCRIPT")
            .arg("LOAD")
            .arg(RESERVE_AND_BUFFER)
            .query_async(&mut conns[0].clone())
            .await?;
        Ok(Self {
            conns: Arc::new(conns),
            next: Arc::new(AtomicUsize::new(0)),
            sha: sha.into(),
        })
    }

    fn conn(&self) -> ConnectionManager {
        let i = self.next.fetch_add(1, Ordering::Relaxed) % self.conns.len();
        self.conns[i].clone()
    }

    /// Readiness must attempt a write, a Redis at maxmemory still answers PING
    /// while every ingest write fails.
    pub async fn ping(&self) -> Result<()> {
        let mut conn = self.conn();
        redis::cmd("SET")
            .arg("von:ready:probe")
            .arg("1")
            .arg("EX")
            .arg(5)
            .query_async::<()>(&mut conn)
            .await?;
        Ok(())
    }

    /// Builds one stream entry per tenant and issues every tenant's script in a single pipeline.
    pub async fn flush_batches(
        &self,
        jobs: &mut [FlushJob],
    ) -> Vec<std::result::Result<Vec<Vec<CreatedEvent>>, Arc<Error>>> {
        let now = chrono::Utc::now();
        let now_iso = now.to_rfc3339();
        let month = now.format("%Y-%m").to_string();
        let window = now.timestamp() / RATE_WINDOW_SECS;

        let mut pipe = redis::pipe();
        let mut per_job_created: Vec<Vec<Vec<CreatedEvent>>> = Vec::with_capacity(jobs.len());

        for job in jobs.iter_mut() {
            let org = &job.tenant.organization_id;
            let mut events = Vec::new();
            let mut deliveries = Vec::new();
            let mut created_per_request = Vec::with_capacity(job.requests.len());

            for request in &mut job.requests {
                let mut created = Vec::with_capacity(request.events.len());
                // Payloads move into the buffer entry, the response only ever needed the ids.
                for evt in request.events.drain(..) {
                    let event_id = uuid::Uuid::new_v4().to_string();

                    for ep in &job.tenant.endpoints {
                        if !matches_event_type(&evt.event_type, ep.events.as_deref()) {
                            continue;
                        }
                        deliveries.push(BufferedDelivery {
                            id: uuid::Uuid::new_v4().to_string(),
                            organization_id: org.clone(),
                            event_id: event_id.clone(),
                            endpoint_id: ep.id.clone(),
                            status: "pending".to_owned(),
                            attempts: 0,
                            created_at: now_iso.clone(),
                        });
                    }

                    created.push(CreatedEvent {
                        id: event_id.clone(),
                        event_type: evt.event_type.clone(),
                        idempotency_key: evt.idempotency_key.clone(),
                        created_at: now_iso.clone(),
                    });
                    events.push(BufferedEvent {
                        id: event_id,
                        organization_id: org.clone(),
                        event_type: evt.event_type,
                        payload: evt.payload,
                        idempotency_key: evt.idempotency_key,
                        created_at: now_iso.clone(),
                    });
                }
                created_per_request.push(created);
            }

            let requested = deliveries.len().max(1) as i64;
            // Throughput is measured in events, not requests, so a batch counts fully.
            let rate_cost = events.len().max(1) as i64;
            let entry = BufferedEntry { events, deliveries };
            // An unencodable entry must fail loudly instead of buffering an empty payload
            // that the flusher would skip while the caller sees a 200.
            let (field, payload) = match encode_entry(&entry) {
                Ok(p) => p,
                Err(err) => {
                    let err = Arc::new(Error::Configuration(format!("entry encode failed, {err}")));
                    return jobs.iter().map(|_| Err(err.clone())).collect();
                }
            };

            pipe.cmd("EVALSHA")
                .arg(&self.sha[..])
                .arg(2)
                .arg(quota_key(org, &month))
                .arg(rate_key(org, window))
                .arg(job.tenant.monthly_limit)
                .arg(requested)
                .arg(QUOTA_TTL)
                .arg(i64::from(job.tenant.has_overage))
                .arg(STREAM_KEY)
                .arg(payload)
                .arg(job.tenant.events_per_second)
                .arg(RATE_WINDOW_SECS)
                .arg(rate_cost)
                .arg(field);

            per_job_created.push(created_per_request);
        }

        let mut conn = self.conn();
        let mut replies: redis::RedisResult<Vec<(i64, i64, String)>> =
            pipe.query_async(&mut conn).await;

        // A restarted Redis loses the cached script, so reload once instead of failing every flush until the process restarts.
        if matches!(&replies, Err(err) if err.kind() == redis::ErrorKind::NoScriptError) {
            let reloaded: redis::RedisResult<String> = redis::cmd("SCRIPT")
                .arg("LOAD")
                .arg(RESERVE_AND_BUFFER)
                .query_async(&mut conn)
                .await;
            if reloaded.is_ok() {
                replies = pipe.query_async(&mut conn).await;
            }
        }

        match replies {
            // A short reply vector would silently drop the tail, leaving those tenants
            // holding their in_flight token forever, so treat any mismatch as a failure.
            Ok(replies) if replies.len() == jobs.len() => replies
                .into_iter()
                .zip(per_job_created)
                .zip(jobs)
                .map(|(((status, usage, _id), created), job)| match status {
                    1 => Ok(created),
                    -1 => Err(Arc::new(Error::RateLimited(
                        job.tenant.organization_id.clone(),
                    ))),
                    _ => Err(Arc::new(Error::QuotaExceeded {
                        used: usage,
                        limit: job.tenant.monthly_limit,
                    })),
                })
                .collect(),
            Ok(replies) => {
                let err = Arc::new(Error::Redis(redis::RedisError::from((
                    redis::ErrorKind::ResponseError,
                    "pipeline reply count mismatch",
                    format!("expected {} replies, got {}", jobs.len(), replies.len()),
                ))));
                jobs.iter().map(|_| Err(err.clone())).collect()
            }
            Err(err) => {
                let err = Arc::new(Error::Redis(err));
                jobs.iter().map(|_| Err(err.clone())).collect()
            }
        }
    }
}
