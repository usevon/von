use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;

pub const STREAM_KEY: &str = "von:event-buffer";
pub const FLUSHER_GROUP: &str = "flusher";

/// Largest accepted payload, matching the ceiling the rest of the industry allows.
pub const MAX_PAYLOAD_BYTES: usize = 1024 * 1024;

/// Payloads are billed in chunks of this size, so a large event costs more than a small one.
pub const BILLABLE_CHUNK_BYTES: usize = 64 * 1024;

/// Number of billable units an event of this size consumes, minimum one.
pub fn billable_units(payload_bytes: usize) -> u32 {
    (payload_bytes.div_ceil(BILLABLE_CHUNK_BYTES)).max(1) as u32
}

#[derive(Serialize, Deserialize)]
pub struct BufferedEntry {
    pub events: Vec<BufferedEvent>,
    pub deliveries: Vec<BufferedDelivery>,
}

#[derive(Serialize, Deserialize)]
pub struct BufferedEvent {
    pub id: String,
    #[serde(rename = "organizationId")]
    pub organization_id: String,
    #[serde(rename = "eventType")]
    pub event_type: String,
    pub payload: Box<RawValue>,
    #[serde(rename = "idempotencyKey")]
    pub idempotency_key: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct BufferedDelivery {
    pub id: String,
    #[serde(rename = "organizationId")]
    pub organization_id: String,
    #[serde(rename = "eventId")]
    pub event_id: String,
    #[serde(rename = "endpointId")]
    pub endpoint_id: String,
    pub status: String,
    pub attempts: u32,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

/// Event as returned to the API caller.
#[derive(Clone, Serialize, Deserialize)]
pub struct CreatedEvent {
    pub id: String,
    #[serde(rename = "eventType")]
    pub event_type: String,
    pub payload: Box<RawValue>,
    #[serde(rename = "idempotencyKey")]
    pub idempotency_key: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

pub fn quota_key(org_id: &str, month: &str) -> String {
    format!("{{{org_id}}}:deliveries:{month}")
}

pub fn rate_key(org_id: &str, window: i64) -> String {
    format!("{{{org_id}}}:rate:{window}")
}
