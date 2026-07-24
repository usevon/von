#![allow(dead_code)]

use hmac::{Hmac, Mac};
use redis::aio::ConnectionManager;
use sha2::{Digest, Sha256};
use sqlx::{PgPool, Row};
use std::sync::Arc;
use von_api::auth::Auth;
use von_api::state::ApiState;

/// A public IP literal so url safety passes without a DNS lookup.
pub const SAFE_URL: &str = "https://93.184.216.34/hook";

pub struct Fixture {
    pub pool: PgPool,
    pub redis: ConnectionManager,
    pub base: String,
    pub client: reqwest::Client,
    pub organization_id: String,
    pub user_id: String,
    signing_secret: String,
}

impl Fixture {
    /// Seeds an isolated organization and user, then serves the real router on a local port.
    pub async fn new() -> Option<Self> {
        dotenvy::from_path("../../.env").ok();
        let (Ok(database_url), Ok(redis_url), Ok(signing_secret)) = (
            std::env::var("DATABASE_URL"),
            std::env::var("REDIS_URL"),
            std::env::var("API_KEY_SIGNING_SECRET"),
        ) else {
            eprintln!("skipping, DATABASE_URL, REDIS_URL, and API_KEY_SIGNING_SECRET are required");
            return None;
        };

        let pool = PgPool::connect(&database_url).await.ok()?;
        let client = redis::Client::open(redis_url).ok()?;
        let redis = ConnectionManager::new(client.clone()).await.ok()?;

        let organization_id = uuid::Uuid::new_v4().to_string();
        let user_id = uuid::Uuid::new_v4().to_string();
        let email = format!("api-test-{user_id}@example.com");

        sqlx::query(
            "INSERT INTO \"user\" (id, name, email, normalized_email, email_verified, \
             created_at, updated_at) \
             VALUES ($1::uuid, 'von api test user', $2, $2, true, now(), now())",
        )
        .bind(&user_id)
        .bind(&email)
        .execute(&pool)
        .await
        .expect("create user");

        // The growth plan has overage so quota reservation never rejects a test.
        sqlx::query(
            "INSERT INTO organization (id, name, slug, created_at, plan) \
             VALUES ($1::uuid, 'von api test org', $2, now(), 'growth')",
        )
        .bind(&organization_id)
        .bind(format!("api-test-{organization_id}"))
        .execute(&pool)
        .await
        .expect("create organization");

        let auth = Arc::new(Auth::new(pool.clone(), Some(redis.clone())));
        von_api::auth::spawn_invalidator(auth.clone(), client);
        let state = Arc::new(ApiState {
            pool: pool.clone(),
            redis: redis.clone(),
            auth,
            tunnels: Default::default(),
            instance_id: format!("test-{organization_id}"),
        });
        let app = von_api::router().with_state(state);
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.ok()?;
        let port = listener.local_addr().ok()?.port();
        tokio::spawn(async move {
            let _ = axum::serve(listener, app).await;
        });

        Some(Self {
            pool,
            redis,
            base: format!("http://127.0.0.1:{port}"),
            client: reqwest::Client::new(),
            organization_id,
            user_id,
            signing_secret,
        })
    }

    fn sign_key(&self, random: &str) -> String {
        let mut mac =
            Hmac::<Sha256>::new_from_slice(self.signing_secret.as_bytes()).expect("mac key");
        mac.update(random.as_bytes());
        let mut hex = hex::encode(mac.finalize().into_bytes());
        hex.truncate(32);
        hex
    }

    async fn insert_key_row(&self, raw: &str, scopes: &[&str], enabled: bool) {
        let mut hasher = Sha256::new();
        hasher.update(raw.as_bytes());
        let hashed = hex::encode(hasher.finalize());

        sqlx::query(
            "INSERT INTO apikey (id, name, start, key, user_id, organization_id, environment, \
             scopes, enabled, created_at, updated_at) \
             VALUES ($1::uuid, $2, 'von_dev_', $3, $4::uuid, $5::uuid, 'dev', $6, $7, now(), now())",
        )
        .bind(uuid::Uuid::new_v4())
        .bind(format!("api-test-{}", uuid::Uuid::new_v4().simple()))
        .bind(&hashed)
        .bind(&self.user_id)
        .bind(&self.organization_id)
        .bind(serde_json::json!(scopes))
        .bind(enabled)
        .execute(&self.pool)
        .await
        .expect("create api key");
    }

    /// Mints a correctly signed key so the auth cache never sees a stale scope set.
    pub async fn create_key(&self, scopes: &[&str]) -> String {
        let random = uuid::Uuid::new_v4().simple().to_string();
        let raw = format!("von_dev_{random}.{}", self.sign_key(&random));
        self.insert_key_row(&raw, scopes, true).await;
        raw
    }

    pub async fn create_disabled_key(&self, scopes: &[&str]) -> String {
        let random = uuid::Uuid::new_v4().simple().to_string();
        let raw = format!("von_dev_{random}.{}", self.sign_key(&random));
        self.insert_key_row(&raw, scopes, false).await;
        raw
    }

    /// The stored row matches the tampered key, so only the signature check can reject it.
    pub async fn create_badly_signed_key(&self) -> String {
        let random = uuid::Uuid::new_v4().simple().to_string();
        let mut signature = self.sign_key(&random);
        let flipped = if signature.as_bytes()[0] == b'0' {
            "1"
        } else {
            "0"
        };
        signature.replace_range(0..1, flipped);
        let raw = format!("von_dev_{random}.{signature}");
        self.insert_key_row(&raw, &["*"], true).await;
        raw
    }

    pub async fn request(
        &self,
        method: reqwest::Method,
        key: &str,
        path: &str,
        body: Option<serde_json::Value>,
    ) -> (u16, serde_json::Value) {
        let mut request = self
            .client
            .request(method, format!("{}{path}", self.base))
            .header("authorization", format!("Bearer {key}"));
        if let Some(body) = body {
            request = request.json(&body);
        }
        let response = request.send().await.expect("request");
        let status = response.status().as_u16();
        let text = response.text().await.unwrap_or_default();
        let value = serde_json::from_str(&text).unwrap_or(serde_json::Value::Null);
        (status, value)
    }

    pub async fn get(&self, key: &str, path: &str) -> (u16, serde_json::Value) {
        self.request(reqwest::Method::GET, key, path, None).await
    }

    pub async fn post(
        &self,
        key: &str,
        path: &str,
        body: serde_json::Value,
    ) -> (u16, serde_json::Value) {
        self.request(reqwest::Method::POST, key, path, Some(body))
            .await
    }

    pub async fn post_empty(&self, key: &str, path: &str) -> (u16, serde_json::Value) {
        self.request(reqwest::Method::POST, key, path, None).await
    }

    pub async fn patch(
        &self,
        key: &str,
        path: &str,
        body: serde_json::Value,
    ) -> (u16, serde_json::Value) {
        self.request(reqwest::Method::PATCH, key, path, Some(body))
            .await
    }

    pub async fn delete(&self, key: &str, path: &str) -> (u16, serde_json::Value) {
        self.request(reqwest::Method::DELETE, key, path, None).await
    }

    /// Sends the authorization header verbatim so scheme casing can be exercised.
    pub async fn get_with_auth_header(&self, header: &str, path: &str) -> u16 {
        self.client
            .get(format!("{}{path}", self.base))
            .header("authorization", header)
            .send()
            .await
            .expect("request")
            .status()
            .as_u16()
    }

    pub async fn seed_endpoint(&self, events: Option<Vec<String>>) -> String {
        let id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO endpoint (id, organization_id, url, secret, status, max_attempts, \
             timeout_ms, events, created_at, updated_at) \
             VALUES ($1::uuid, $2::uuid, $3, $4, 'active', 4, 5000, $5, now(), now())",
        )
        .bind(&id)
        .bind(&self.organization_id)
        .bind(SAFE_URL)
        .bind(von_api::cipher::encrypt_secret("whsec_test").expect("encrypt"))
        .bind(&events)
        .execute(&self.pool)
        .await
        .expect("seed endpoint");
        id
    }

    pub async fn seed_event(&self, event_type: &str) -> String {
        let id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO event (id, organization_id, event_type, payload, created_at) \
             VALUES ($1::uuid, $2::uuid, $3, '{}'::jsonb, now())",
        )
        .bind(&id)
        .bind(&self.organization_id)
        .bind(event_type)
        .execute(&self.pool)
        .await
        .expect("seed event");
        id
    }

    pub async fn seed_delivery(&self, event_id: &str, endpoint_id: &str, status: &str) -> String {
        let id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO delivery (id, organization_id, event_id, endpoint_id, status, attempts, \
             created_at) \
             VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, 0, now())",
        )
        .bind(&id)
        .bind(&self.organization_id)
        .bind(event_id)
        .bind(endpoint_id)
        .bind(status)
        .execute(&self.pool)
        .await
        .expect("seed delivery");
        id
    }

    pub async fn deliveries_for_event(&self, event_id: &str) -> Vec<(String, String, String)> {
        sqlx::query(
            "SELECT id::text AS id, endpoint_id::text AS endpoint_id, status \
             FROM delivery WHERE event_id = $1::uuid ORDER BY created_at, id",
        )
        .bind(event_id)
        .fetch_all(&self.pool)
        .await
        .expect("deliveries")
        .iter()
        .map(|row| {
            (
                row.try_get("id").expect("id"),
                row.try_get("endpoint_id").expect("endpoint_id"),
                row.try_get("status").expect("status"),
            )
        })
        .collect()
    }

    /// Spreads endpoint created_at values a second apart so cursor paging is deterministic.
    pub async fn stagger_endpoint_created_at(&self, ids: &[String]) {
        for (index, id) in ids.iter().enumerate() {
            sqlx::query(
                "UPDATE endpoint SET created_at = now() - make_interval(secs => $1) \
                 WHERE id = $2::uuid",
            )
            .bind((index as f64) + 1.0)
            .bind(id)
            .execute(&self.pool)
            .await
            .expect("stagger created_at");
        }
    }

    pub async fn put_session(&self, token: &str, expires_at: chrono::DateTime<chrono::Utc>) {
        let record = serde_json::json!({
            "session": {
                "userId": self.user_id,
                "activeOrganizationId": self.organization_id,
                "expiresAt": expires_at.to_rfc3339(),
            }
        });
        let mut conn = self.redis.clone();
        let _: redis::RedisResult<()> = redis::cmd("SET")
            .arg(token)
            .arg(record.to_string())
            .arg("EX")
            .arg(300)
            .query_async(&mut conn)
            .await;
    }

    pub async fn delete_redis_key(&self, key: &str) {
        let mut conn = self.redis.clone();
        let _: redis::RedisResult<()> = redis::cmd("DEL").arg(key).query_async(&mut conn).await;
    }

    /// Deleting the organization cascades every row a test created under it.
    pub async fn cleanup(&self) {
        let _ = sqlx::query("DELETE FROM organization WHERE id = $1::uuid")
            .bind(&self.organization_id)
            .execute(&self.pool)
            .await;
        let _ = sqlx::query("DELETE FROM \"user\" WHERE id = $1::uuid")
            .bind(&self.user_id)
            .execute(&self.pool)
            .await;
    }
}

/// Matches the exact shape to_iso emits, millisecond precision ending in Z.
pub fn is_iso_millis(value: &str) -> bool {
    value.len() == 24
        && value.ends_with('Z')
        && chrono::NaiveDateTime::parse_from_str(value, "%Y-%m-%dT%H:%M:%S%.3fZ").is_ok()
}
