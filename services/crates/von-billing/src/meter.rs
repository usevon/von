use crate::client::AutumnClient;
use dashmap::{DashMap, DashSet};
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
    blocked: DashSet<String>,
    customers: DashSet<String>,
}

impl Meter {
    pub fn new(secret_key: String, feature_id: String) -> Arc<Self> {
        let meter = Arc::new(Self {
            client: AutumnClient::new(secret_key),
            feature_id,
            pending: DashMap::new(),
            blocked: DashSet::new(),
            customers: DashSet::new(),
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
        self.blocked.contains(organization_id)
    }

    async fn ensure_customer(&self, organization_id: &str) {
        if self.customers.contains(organization_id) {
            return;
        }
        let body = json!({ "id": organization_id });
        match self.client.post("customers", body).await {
            Ok(_) => {
                self.customers.insert(organization_id.to_owned());
            }
            Err(err) => eprintln!("autumn customer creation failed, {err}"),
        }
    }

    /// Drains counters and reports totals rather than individual events, which is
    /// what keeps a 30k per second ingest inside Autumn's rate limits.
    pub async fn flush(&self) {
        let mut drained: Vec<(String, u64)> = Vec::new();
        for entry in self.pending.iter() {
            let value = entry.value().swap(0, Ordering::Relaxed);
            if value > 0 {
                drained.push((entry.key().clone(), value));
            }
        }

        for (index, chunk) in drained.chunks(BATCH_LIMIT).enumerate() {
            for (organization_id, _) in chunk {
                self.ensure_customer(organization_id).await;
            }
            let body = Value::Array(
                chunk
                    .iter()
                    .map(|(organization_id, value)| {
                        json!({
                            "customer_id": organization_id,
                            "feature_id": self.feature_id,
                            "value": value,
                        })
                    })
                    .collect(),
            );
            if let Err(err) = self.client.post("balances.batch_track", body).await {
                // Autumn says not to retry a partial batch, so only the unsent counts go
                // back and the next flush reports them again without double billing.
                eprintln!("autumn batch_track failed, restoring unsent counts, {err}");
                for (organization_id, value) in &drained[index * BATCH_LIMIT..] {
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
                    if has_balance && !allowed {
                        self.blocked.insert(organization_id);
                    } else {
                        self.blocked.remove(&organization_id);
                    }
                }
                // A billing outage must never stop ingest, so the tenant stays allowed.
                Err(err) => eprintln!("autumn check failed, leaving access open, {err}"),
            }
        }
    }
}
