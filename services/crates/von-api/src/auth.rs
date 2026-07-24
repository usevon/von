use dashmap::DashMap;
use hmac::{Hmac, Mac};
use redis::aio::ConnectionManager;
use sha2::{Digest, Sha256};
use sqlx::{PgPool, Row};
use std::sync::Arc;
use std::time::{Duration, Instant};
use von_error::{Error, Result};

const CACHE_TTL: Duration = Duration::from_secs(10);

#[derive(Clone)]
pub struct Endpoint {
    pub id: String,
    pub events: Option<Vec<String>>,
}

pub struct Tenant {
    pub organization_id: String,
    pub user_id: String,
    pub plan: String,
    pub endpoints: Vec<Endpoint>,
    pub monthly_limit: i64,
    pub has_overage: bool,
    pub events_per_second: i64,
    pub scopes: Vec<String>,
}

/// Identity a request proved from an API key or dashboard session, without needing a plan or endpoints.
pub struct Principal {
    pub organization_id: String,
    pub user_id: String,
    pub scopes: Vec<String>,
}

/// Mirrors the typescript hasScope so a key grants the same access on both services.
fn has_scope(scopes: &[String], required: &str) -> bool {
    if scopes.iter().any(|s| s == "*" || s == required) {
        return true;
    }
    match required.split_once(':') {
        Some((action, _)) => {
            let wildcard = format!("{action}:*");
            scopes.contains(&wildcard)
        }
        None => false,
    }
}

fn require_scope(scopes: &[String], required: &str) -> Result<()> {
    if has_scope(scopes, required) {
        return Ok(());
    }
    Err(Error::InsufficientScope(required.to_owned()))
}

struct Entry {
    tenant: Arc<Tenant>,
    key_id: String,
    expires_at: Instant,
}

#[derive(serde::Deserialize)]
struct SessionRecord {
    session: StoredSession,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredSession {
    user_id: String,
    active_organization_id: Option<String>,
    expires_at: chrono::DateTime<chrono::Utc>,
}

pub struct Auth {
    pool: PgPool,
    cache: DashMap<String, Entry>,
    signing_secret: Option<String>,
    redis: Option<ConnectionManager>,
}

pub struct PlanLimits {
    pub monthly: i64,
    pub overage: bool,
    pub per_second: i64,
}

/// The single limits table, unknown plans get the starter tier.
pub fn plan_limits(plan: &str) -> PlanLimits {
    match plan {
        "free" | "hobby" => PlanLimits {
            monthly: 50_000,
            overage: false,
            per_second: 100,
        },
        "growth" => PlanLimits {
            monthly: 1_000_000,
            overage: true,
            per_second: 2_000,
        },
        "scale" => PlanLimits {
            monthly: 10_000_000,
            overage: true,
            per_second: 10_000,
        },
        "enterprise" => PlanLimits {
            monthly: i64::MAX,
            overage: true,
            per_second: 0,
        },
        _ => PlanLimits {
            monthly: 250_000,
            overage: true,
            per_second: 500,
        },
    }
}

/// Evicts cached tenants when the dashboard announces a key mutation, closing
/// the revocation window the cache TTL would otherwise leave open.
pub fn spawn_invalidator(auth: Arc<Auth>, client: redis::Client) {
    use futures_util::StreamExt;

    tokio::spawn(async move {
        loop {
            if let Ok(mut pubsub) = client.get_async_pubsub().await
                && pubsub.subscribe("von:auth:invalidate").await.is_ok()
            {
                let mut messages = pubsub.on_message();
                while let Some(message) = messages.next().await {
                    if let Ok(organization_id) = message.get_payload::<String>() {
                        auth.invalidate_organization(&organization_id);
                    }
                }
            }
            tokio::time::sleep(Duration::from_secs(1)).await;
        }
    });
}

fn hash_key(raw: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(raw.as_bytes());
    hex::encode(hasher.finalize())
}

const KEY_PREFIXES: [&str; 3] = ["von_dev_", "von_stg_", "von_prod_"];
const SIGNATURE_LEN: usize = 32;

/// Keys carry an hmac of their random part, so a forged one is rejected on cpu
/// alone rather than costing a database lookup.
fn signature_is_valid(raw: &str, secret: &str) -> bool {
    let Some(dot) = raw.rfind('.') else {
        return false;
    };
    let Some(prefix) = KEY_PREFIXES.iter().find(|p| raw.starts_with(**p)) else {
        return false;
    };

    let random = &raw[prefix.len()..dot];
    let signature = &raw[dot + 1..];

    let Ok(mut mac) = Hmac::<Sha256>::new_from_slice(secret.as_bytes()) else {
        return false;
    };
    mac.update(random.as_bytes());
    let expected = hex::encode(mac.finalize().into_bytes());
    let expected = &expected[..SIGNATURE_LEN.min(expected.len())];

    expected.len() == signature.len()
        && expected
            .bytes()
            .zip(signature.bytes())
            .fold(0u8, |acc, (a, b)| acc | (a ^ b))
            == 0
}

impl Auth {
    pub fn new(pool: PgPool, redis: Option<ConnectionManager>) -> Self {
        Self {
            pool,
            cache: DashMap::new(),
            signing_secret: std::env::var("API_KEY_SIGNING_SECRET").ok(),
            redis,
        }
    }

    /// Records the key as recently used for the dashboard, batched into Postgres
    /// elsewhere so an authenticated request never pays a write.
    fn mark_used(&self, key_id: &str) {
        let Some(mut conn) = self.redis.clone() else {
            return;
        };
        let key_id = key_id.to_owned();
        tokio::spawn(async move {
            let now = chrono::Utc::now().timestamp().to_string();
            let _: redis::RedisResult<()> = redis::pipe()
                .cmd("SET")
                .arg(format!("api:lastUsed:{key_id}"))
                .arg(now)
                .ignore()
                .cmd("SADD")
                .arg("api:lastUsed:dirty")
                .arg(&key_id)
                .ignore()
                .query_async(&mut conn)
                .await;
        });
    }

    /// Endpoint mutations change what the cached tenant would route to, so the
    /// affected organization's keys are dropped rather than left to expire.
    pub fn invalidate_organization(&self, organization_id: &str) {
        self.cache
            .retain(|_, entry| entry.tenant.organization_id != organization_id);
    }

    pub async fn ping(&self) -> Result<()> {
        sqlx::query("SELECT 1").execute(&self.pool).await?;
        Ok(())
    }

    /// better-auth keys the session in redis by the bearer token verbatim and never
    /// reads the session table once secondary storage is configured.
    async fn resolve_session(&self, token: &str) -> Result<Option<Principal>> {
        let Some(mut conn) = self.redis.clone() else {
            return Ok(None);
        };

        let stored: Option<String> = redis::cmd("GET").arg(token).query_async(&mut conn).await?;
        let Some(stored) = stored else {
            return Ok(None);
        };

        let Ok(record) = serde_json::from_str::<SessionRecord>(&stored) else {
            return Ok(None);
        };
        let Some(organization_id) = record.session.active_organization_id else {
            return Ok(None);
        };
        if record.session.expires_at <= chrono::Utc::now() {
            return Ok(None);
        }

        Ok(Some(Principal {
            organization_id,
            user_id: record.session.user_id,
            scopes: vec!["*".to_owned()],
        }))
    }

    /// Tries the API key first and falls back to a dashboard session, matching
    /// the order the typescript resolver uses so a bearer resolves the same way.
    pub async fn resolve_principal(&self, raw: &str) -> Result<Principal> {
        match self.resolve(raw).await {
            Ok(tenant) => Ok(Principal {
                organization_id: tenant.organization_id.clone(),
                user_id: tenant.user_id.clone(),
                scopes: tenant.scopes.clone(),
            }),
            Err(Error::InvalidApiKey) => {
                self.resolve_session(raw).await?.ok_or(Error::InvalidApiKey)
            }
            Err(err) => Err(err),
        }
    }

    pub async fn resolve_principal_scoped(&self, raw: &str, scope: &str) -> Result<Principal> {
        let principal = self.resolve_principal(raw).await?;
        require_scope(&principal.scopes, scope)?;
        Ok(principal)
    }

    /// Resolving and authorizing together so a handler cannot forget the scope check.
    pub async fn resolve_scoped(&self, raw_key: &str, scope: &str) -> Result<Arc<Tenant>> {
        let tenant = self.resolve(raw_key).await?;
        require_scope(&tenant.scopes, scope)?;
        Ok(tenant)
    }

    pub async fn resolve(&self, raw_key: &str) -> Result<Arc<Tenant>> {
        if let Some(secret) = &self.signing_secret
            && !signature_is_valid(raw_key, secret)
        {
            return Err(Error::InvalidApiKey);
        }

        let hashed = hash_key(raw_key);

        if let Some(entry) = self.cache.get(&hashed)
            && Instant::now() < entry.expires_at
        {
            self.mark_used(&entry.key_id);
            return Ok(entry.tenant.clone());
        }

        let row = sqlx::query(
            "SELECT k.id::text AS key_id, k.scopes AS scopes, k.user_id::text AS user_id, \
             o.id::text AS org_id, o.plan AS plan \
             FROM apikey k \
             JOIN organization o ON o.id = k.organization_id \
             WHERE k.key = $1 AND k.enabled = true \
               AND (k.expires_at IS NULL OR k.expires_at > now()) \
             LIMIT 1",
        )
        .bind(&hashed)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(Error::InvalidApiKey)?;

        let key_id: String = row.try_get("key_id")?;
        let org_id: String = row.try_get("org_id")?;
        let user_id: String = row.try_get("user_id").unwrap_or_default();
        let plan: String = row.try_get("plan").unwrap_or_else(|_| "hobby".to_owned());
        let scopes: Vec<String> = row
            .try_get::<Option<serde_json::Value>, _>("scopes")
            .ok()
            .flatten()
            .and_then(|v| serde_json::from_value(v).ok())
            .unwrap_or_default();

        let endpoint_rows = sqlx::query(
            "SELECT id::text AS id, events \
             FROM endpoint \
             WHERE organization_id = $1::uuid AND status = 'active'",
        )
        .bind(&org_id)
        .fetch_all(&self.pool)
        .await?;

        let endpoints: Vec<Endpoint> = endpoint_rows
            .into_iter()
            .filter_map(|e| {
                let id: String = e.try_get("id").ok()?;
                // The column is text[], reading it as json silently yields None,
                // which would route every event type to every endpoint.
                let events: Option<Vec<String>> = e.try_get("events").ok().flatten();
                Some(Endpoint { id, events })
            })
            .collect();

        let limits = plan_limits(&plan);
        let tenant = Arc::new(Tenant {
            organization_id: org_id,
            user_id,
            plan,
            endpoints,
            monthly_limit: limits.monthly,
            has_overage: limits.overage,
            events_per_second: limits.per_second,
            scopes,
        });

        self.mark_used(&key_id);
        self.cache.insert(
            hashed,
            Entry {
                tenant: tenant.clone(),
                key_id,
                expires_at: Instant::now() + CACHE_TTL,
            },
        );

        Ok(tenant)
    }
}
