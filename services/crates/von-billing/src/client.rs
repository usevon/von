use serde_json::Value;
use std::time::Duration;

pub const DEFAULT_BASE_URL: &str = "https://api.useautumn.com/v1";
pub const DEFAULT_FEATURE: &str = "messages";

const API_VERSION: &str = "2.3.0";
const CALL_TIMEOUT: Duration = Duration::from_secs(10);

pub struct AutumnClient {
    http: reqwest::Client,
    secret_key: String,
    base_url: String,
}

impl AutumnClient {
    pub fn new(secret_key: String) -> Self {
        Self::with_base_url(secret_key, DEFAULT_BASE_URL.into())
    }

    pub fn with_base_url(secret_key: String, base_url: String) -> Self {
        let http = reqwest::Client::builder()
            .timeout(CALL_TIMEOUT)
            .build()
            .expect("reqwest client");
        Self {
            http,
            secret_key,
            base_url: base_url.trim_end_matches('/').to_string(),
        }
    }

    pub async fn post(&self, path: &str, body: Value) -> Result<Value, String> {
        let resp = self
            .http
            .post(format!("{}/{path}", self.base_url))
            .bearer_auth(&self.secret_key)
            .header("x-api-version", API_VERSION)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let status = resp.status();
        let payload: Value = resp.json().await.unwrap_or(Value::Null);

        if !status.is_success() {
            let message = payload
                .pointer("/error/message")
                .or_else(|| payload.get("message"))
                .and_then(Value::as_str)
                .unwrap_or("unknown error");
            return Err(format!("autumn {status}, {message}"));
        }
        Ok(payload)
    }
}
