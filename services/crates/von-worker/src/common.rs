// Knobs and helpers shared by the delivery and inbound pollers.

use hmac::{Hmac, Mac};
use sha2::Sha256;

pub fn concurrency() -> usize {
    std::env::var("WORKER_CONCURRENCY")
        .ok()
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(50)
        .clamp(1, 500)
}

/// A claimed row's next_attempt_at is pushed out by this much, so a worker that dies mid-send
/// leaves the row pollable again once the lease expires.
pub fn lease_secs() -> f64 {
    std::env::var("WORKER_LEASE_SECS")
        .ok()
        .and_then(|v| v.parse::<f64>().ok())
        .unwrap_or(60.0)
}

/// Base of the exponential retry backoff, overridable so tests and self hosted
/// deploys can tune how fast the poll re-exposes a failed row.
pub fn backoff_base_secs() -> f64 {
    std::env::var("WORKER_BACKOFF_BASE_SECS")
        .ok()
        .and_then(|v| v.parse::<f64>().ok())
        .unwrap_or(1.0)
}

/// Redirect following would let a target url bounce to an internal address.
pub fn http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .expect("reqwest client build")
}

pub fn sign(payload: &str, secret: &str) -> String {
    let Ok(mut mac) = Hmac::<Sha256>::new_from_slice(secret.as_bytes()) else {
        return String::new();
    };
    mac.update(payload.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}
