use crate::redis_ops::RedisOps;
use dashmap::DashMap;
use serde_json::value::RawValue;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tokio::sync::{Notify, mpsc, oneshot};
use von_api::auth::Tenant;
use von_error::Error;
use von_types::CreatedEvent;

pub const LARGE_REQUEST_EVENTS: usize = 250;
pub const MAX_BATCH_EVENTS: usize = 1000;
pub const MAX_BATCH_BYTES: usize = 1024 * 1024;

/// Serialized size of one delivery record in a stream entry, two uuids plus ids and a timestamp.
const DELIVERY_RECORD_BYTES: usize = 200;

const MAX_INFLIGHT_PIPELINES: usize = 4;

fn lock<T>(m: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    // A panic elsewhere must not poison a tenant into permanent failure.
    m.lock().unwrap_or_else(|e| e.into_inner())
}

pub struct IncomingEvent {
    pub event_type: String,
    pub payload: Box<RawValue>,
    pub idempotency_key: Option<String>,
    pub payload_bytes: usize,
}

pub struct PendingRequest {
    pub events: Vec<IncomingEvent>,
    pub payload_bytes: usize,
    pub responder: oneshot::Sender<std::result::Result<Vec<CreatedEvent>, Arc<Error>>>,
}

struct TenantState {
    pending: Vec<PendingRequest>,
    in_flight: bool,
}

impl TenantState {
    fn new() -> Self {
        Self {
            pending: Vec::new(),
            in_flight: false,
        }
    }

    /// Takes whole requests up to the caps, costing bytes by fanout because each
    /// event produces one delivery record per matching endpoint.
    fn drain_capped(&mut self, fanout: usize) -> Vec<PendingRequest> {
        let mut taken = 0usize;
        let mut events = 0usize;
        let mut bytes = 0usize;
        let per_delivery = DELIVERY_RECORD_BYTES * fanout.max(1);

        for req in &self.pending {
            let req_events = req.events.len();
            let req_bytes = req.payload_bytes + req_events * per_delivery;

            if taken > 0
                && (events + req_events > MAX_BATCH_EVENTS || bytes + req_bytes > MAX_BATCH_BYTES)
            {
                break;
            }

            events += req_events;
            bytes += req_bytes;
            taken += 1;
        }

        self.pending.drain(..taken).collect()
    }
}

pub struct FlushJob {
    pub tenant: Arc<Tenant>,
    pub requests: Vec<PendingRequest>,
    /// Bypass jobs never claimed the tenant's in_flight token, so completing one
    /// must not release it or two flush chains would run for the same tenant.
    pub bypass: bool,
}

pub struct Coalescer {
    tenants: DashMap<String, Mutex<TenantState>>,
    tx: mpsc::UnboundedSender<FlushJob>,
    draining: AtomicBool,
    alive: AtomicBool,
    idle: Notify,
}

impl Coalescer {
    pub fn start(redis: RedisOps) -> Arc<Self> {
        let (tx, rx) = mpsc::unbounded_channel();
        let coalescer = Arc::new(Self {
            tenants: DashMap::new(),
            tx,
            draining: AtomicBool::new(false),
            alive: AtomicBool::new(true),
            idle: Notify::new(),
        });

        // If the flush loop ever dies the service can never flush again, so it is
        // supervised and the failure is surfaced through the health endpoint.
        let watched = coalescer.clone();
        let handle = tokio::spawn(flush_loop(coalescer.clone(), redis, rx));
        tokio::spawn(async move {
            let outcome = handle.await;
            watched.alive.store(false, Ordering::SeqCst);
            eprintln!("flush loop exited, service is unhealthy: {outcome:?}");
        });

        coalescer
    }

    pub fn is_draining(&self) -> bool {
        self.draining.load(Ordering::SeqCst)
    }

    pub fn is_healthy(&self) -> bool {
        self.alive.load(Ordering::SeqCst)
    }

    /// Stops accepting new work and waits until every buffered request has been
    /// flushed to Redis, so a restart cannot drop acknowledged-in-progress events.
    pub async fn drain(&self) {
        self.draining.store(true, Ordering::SeqCst);
        loop {
            if !self.has_work() {
                return;
            }
            tokio::select! {
                _ = self.idle.notified() => {}
                _ = tokio::time::sleep(std::time::Duration::from_millis(50)) => {}
            }
        }
    }

    fn has_work(&self) -> bool {
        self.tenants.iter().any(|e| {
            let state = lock(e.value());
            state.in_flight || !state.pending.is_empty()
        })
    }

    pub fn submit(
        &self,
        tenant: Arc<Tenant>,
        events: Vec<IncomingEvent>,
    ) -> oneshot::Receiver<std::result::Result<Vec<CreatedEvent>, Arc<Error>>> {
        let (responder, rx) = oneshot::channel();
        // Measured once here so the flush path never re-serializes payloads to size them.
        let payload_bytes = events.iter().map(|e| e.payload_bytes).sum();
        let request = PendingRequest {
            events,
            payload_bytes,
            responder,
        };

        // A request already large enough to amortize its own round trip skips the queue entirely.
        if request.events.len() >= LARGE_REQUEST_EVENTS {
            let _ = self.tx.send(FlushJob {
                tenant,
                requests: vec![request],
                bypass: true,
            });
            return rx;
        }

        let fanout = tenant.endpoints.len();
        let entry = self
            .tenants
            .entry(tenant.organization_id.clone())
            .or_insert_with(|| Mutex::new(TenantState::new()));
        let mut state = lock(entry.value());
        state.pending.push(request);

        if !state.in_flight {
            state.in_flight = true;
            let batch = state.drain_capped(fanout);
            drop(state);
            let _ = self.tx.send(FlushJob {
                tenant,
                requests: batch,
                bypass: false,
            });
        }

        rx
    }

    fn on_flush_complete(&self, tenant: Arc<Tenant>) -> Option<FlushJob> {
        let fanout = tenant.endpoints.len();
        let entry = self.tenants.get(&tenant.organization_id)?;
        let mut state = lock(entry.value());

        if state.pending.is_empty() {
            state.in_flight = false;
            drop(state);
            self.idle.notify_waiters();
            return None;
        }

        let batch = state.drain_capped(fanout);
        Some(FlushJob {
            tenant,
            requests: batch,
            bypass: false,
        })
    }
}

async fn flush_loop(
    coalescer: Arc<Coalescer>,
    redis: RedisOps,
    mut rx: mpsc::UnboundedReceiver<FlushJob>,
) {
    // Pipelines overlap in flight while in_flight keeps per tenant ordering.
    let slots = Arc::new(tokio::sync::Semaphore::new(MAX_INFLIGHT_PIPELINES));

    while let Some(first) = rx.recv().await {
        let mut jobs = vec![first];
        // Everything already queued joins this round trip, which is where cross tenant batching happens.
        while let Ok(job) = rx.try_recv() {
            jobs.push(job);
        }

        let Ok(permit) = slots.clone().acquire_owned().await else {
            return;
        };
        let redis = redis.clone();
        let coalescer = coalescer.clone();

        tokio::spawn(async move {
            let outcomes = redis.flush_batches(&jobs).await;

            for (job, outcome) in jobs.into_iter().zip(outcomes) {
                respond(job.requests, outcome);
                // A bypass job never took the token, so releasing it here would let a
                // second chain start while the tenant's real batch is still in flight.
                if job.bypass {
                    continue;
                }
                if let Some(next) = coalescer.on_flush_complete(job.tenant) {
                    let _ = coalescer.tx.send(next);
                }
            }
            drop(permit);
        });
    }
}

fn respond(
    requests: Vec<PendingRequest>,
    outcome: std::result::Result<Vec<Vec<CreatedEvent>>, Arc<Error>>,
) {
    match outcome {
        Ok(per_request) => {
            for (request, created) in requests.into_iter().zip(per_request) {
                let _ = request.responder.send(Ok(created));
            }
        }
        Err(err) => {
            for request in requests {
                let _ = request.responder.send(Err(err.clone()));
            }
        }
    }
}
