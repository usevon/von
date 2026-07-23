use serde_json::Value;
use std::time::Duration;

pub const DEFAULT_FEATURE: &str = "messages";

const BASE_URL: &str = "https://api.useautumn.com/v1";
const API_VERSION: &str = "2.3.0";
const CALL_TIMEOUT: Duration = Duration::from_secs(10);

pub struct AutumnClient {
    http: reqwest::Client,
    secret_key: String,
}

impl AutumnClient {
    pub fn new(secret_key: String) -> Self {
        let http = reqwest::Client::builder()
            .timeout(CALL_TIMEOUT)
            .build()
            .expect("reqwest client");
        Self { http, secret_key }
    }

    pub async fn post(&self, path: &str, body: Value) -> Result<Value, String> {
        let resp = self
            .http
            .post(format!("{BASE_URL}/{path}"))
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
