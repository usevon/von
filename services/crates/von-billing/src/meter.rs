use crate::client::AutumnClient;
use dashmap::DashMap;
use serde_json::{Value, json};
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

/// Autumn accepts up to this many items in one batch_track call.
const BATCH_LIMIT: usize = 1000;

const FLUSH_INTERVAL: Duration = Duration::from_secs(30);
const ENTITLEMENT_REFRESH: Duration = Duration::from_secs(60);

pub struct Meter {
    client: AutumnClient,
    feature_id: String,
    pending: DashMap<String, AtomicU64>,
    blocked: DashMap<String, bool>,
    customers: DashMap<String, ()>,
}

impl Meter {
    pub fn new(secret_key: String, feature_id: String) -> Arc<Self> {
        let meter = Arc::new(Self {
            client: AutumnClient::new(secret_key),
            feature_id,
            pending: DashMap::new(),
            blocked: DashMap::new(),
            customers: DashMap::new(),
        });

        let flusher = meter.clone();
        tokio::spawn(async move {
            let mut ticker = tokio::time::interval(FLUSH_INTERVAL);
            loop {
                ticker.tick().await;
                flusher.flush().await;
            }
        });

        let refresher = meter.clone();
        tokio::spawn(async move {
            let mut ticker = tokio::time::interval(ENTITLEMENT_REFRESH);
            loop {
                ticker.tick().await;
                refresher.refresh_entitlements().await;
            }
        });

        meter
    }

    /// Called on the ingest hot path, so it only touches memory.
    pub fn record(&self, organization_id: &str, units: u64) {
        if let Some(counter) = self.pending.get(organization_id) {
            counter.fetch_add(units, Ordering::Relaxed);
            return;
        }
        self.pending
            .entry(organization_id.to_owned())
            .or_insert_with(|| AtomicU64::new(0))
            .fetch_add(units, Ordering::Relaxed);
    }

    /// Reads the cached entitlement, never the network, so ingest cannot stall on billing.
    pub fn is_over_limit(&self, organization_id: &str) -> bool {
        self.blocked
            .get(organization_id)
            .map(|b| *b)
            .unwrap_or(false)
    }

    async fn ensure_customer(&self, organization_id: &str) {
        if self.customers.contains_key(organization_id) {
            return;
        }
        let body = json!({ "id": organization_id });
        match self.client.post("customers", body).await {
            Ok(_) => {
                self.customers.insert(organization_id.to_owned(), ());
            }
            Err(err) => eprintln!("autumn customer creation failed, {err}"),
        }
    }

    /// Drains counters and reports totals rather than individual events, which is
    /// what keeps a 30k per second ingest inside Autumn's rate limits.
    pub async fn flush(&self) {
        let mut items: Vec<Value> = Vec::new();
        let mut drained: Vec<(String, u64)> = Vec::new();

        for entry in self.pending.iter() {
            let value = entry.value().swap(0, Ordering::Relaxed);
            if value == 0 {
                continue;
            }
            drained.push((entry.key().clone(), value));
        }

        for (organization_id, value) in &drained {
            self.ensure_customer(organization_id).await;
            items.push(json!({
                "customer_id": organization_id,
                "feature_id": self.feature_id,
                "value": value,
            }));
        }

        for chunk in items.chunks(BATCH_LIMIT) {
            let body = Value::Array(chunk.to_vec());
            if let Err(err) = self.client.post("balances.batch_track", body).await {
                // Autumn says not to retry a partial batch, so the counts go back and
                // the next flush reports them again rather than risking double billing.
                eprintln!("autumn batch_track failed, restoring counts, {err}");
                for (organization_id, value) in &drained {
                    self.record(organization_id, *value);
                }
                return;
            }
        }
    }

    async fn refresh_entitlements(&self) {
        let organizations: Vec<String> = self.customers.iter().map(|e| e.key().clone()).collect();

        for organization_id in organizations {
            let body = json!({
                "customer_id": organization_id,
                "feature_id": self.feature_id,
                "required_balance": 1,
            });
            match self.client.post("balances.check", body).await {
                Ok(out) => {
                    // A missing balance means no plan is attached rather than an
                    // exhausted one, and blocking on that would reject new tenants.
                    let has_balance = !out["balance"].is_null();
                    let allowed = out["allowed"].as_bool().unwrap_or(true);
                    self.blocked
                        .insert(organization_id, has_balance && !allowed);
                }
                // A billing outage must never stop ingest, so the tenant stays allowed.
                Err(err) => eprintln!("autumn check failed, leaving access open, {err}"),
            }
        }
    }
}
