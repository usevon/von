use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;

pub const STREAM_KEY: &str = "von:event-buffer";
pub const FLUSHER_GROUP: &str = "flusher";

pub const ENTRY_FIELD_PLAIN: &str = "data";
pub const ENTRY_FIELD_ZSTD: &str = "z";

/// Entries at or above this serialized size compress well enough to pay for the CPU.
pub const COMPRESS_THRESHOLD_BYTES: usize = 4 * 1024;

/// Encodes an entry for the buffer stream, large entries come back zstd compressed
/// under the z field so every byte-bound stage downstream moves 5 to 8x less data.
pub fn encode_entry(entry: &BufferedEntry) -> serde_json::Result<(&'static str, Vec<u8>)> {
    let json = serde_json::to_vec(entry)?;
    if json.len() >= COMPRESS_THRESHOLD_BYTES
        && let Ok(z) = zstd::encode_all(&json[..], 1)
    {
        return Ok((ENTRY_FIELD_ZSTD, z));
    }
    Ok((ENTRY_FIELD_PLAIN, json))
}

/// Decodes a stream entry from either wire format.
pub fn decode_entry(field: &str, value: &[u8]) -> Result<BufferedEntry, String> {
    let inflated;
    let bytes = if field == ENTRY_FIELD_ZSTD {
        inflated = zstd::decode_all(value).map_err(|e| format!("zstd decode failed, {e}"))?;
        &inflated[..]
    } else {
        value
    };
    serde_json::from_slice(bytes).map_err(|e| format!("entry parse failed, {e}"))
}

/// Largest accepted payload, matching the ceiling the rest of the industry allows.
pub const MAX_PAYLOAD_BYTES: usize = 1024 * 1024;

/// Payloads are billed in chunks of this size, so a large event costs more than a small one.
pub const BILLABLE_CHUNK_BYTES: usize = 64 * 1024;

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

/// The response deliberately omits the payload, the sender already holds it and
/// echoing it back would double the wire cost of every large event.
#[derive(Clone, Serialize, Deserialize)]
pub struct CreatedEvent {
    pub id: String,
    #[serde(rename = "eventType")]
    pub event_type: String,
    #[serde(rename = "idempotencyKey")]
    pub idempotency_key: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

/// Matches an event type against an endpoint filter, a missing or empty filter
/// matches everything and a trailing star does prefix matching.
pub fn matches_event_type(event_type: &str, filter: Option<&[String]>) -> bool {
    let Some(list) = filter else {
        return true;
    };
    if list.is_empty() {
        return true;
    }
    list.iter().any(|pattern| {
        pattern
            .strip_suffix('*')
            .map(|prefix| event_type.starts_with(prefix))
            .unwrap_or(pattern == event_type)
    })
}

/// The monthly quota counter outlives the month by a wide margin, then expires on its own.
pub const QUOTA_TTL: i64 = 3_888_000;

pub fn quota_key(org_id: &str, month: &str) -> String {
    format!("{{{org_id}}}:deliveries:{month}")
}

pub fn rate_key(org_id: &str, window: i64) -> String {
    format!("{{{org_id}}}:rate:{window}")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn list(patterns: &[&str]) -> Vec<String> {
        patterns.iter().map(|p| (*p).to_owned()).collect()
    }

    /// This is the live fanout routing, both ingest and replay must keep these semantics.
    #[test]
    fn event_type_matching_pins_routing_semantics() {
        assert!(matches_event_type("order.created", None));
        assert!(matches_event_type("order.created", Some(&list(&[]))));
        assert!(matches_event_type(
            "order.created",
            Some(&list(&["order.created"]))
        ));
        assert!(!matches_event_type(
            "order.created",
            Some(&list(&["order.paid"]))
        ));
        assert!(matches_event_type(
            "order.created",
            Some(&list(&["order.*"]))
        ));
        assert!(!matches_event_type(
            "invoice.paid",
            Some(&list(&["order.*"]))
        ));
        assert!(matches_event_type("anything.at.all", Some(&list(&["*"]))));
        // A leading star is not a supported wildcard position, only trailing stars match.
        assert!(!matches_event_type(
            "order.created",
            Some(&list(&["*.created"]))
        ));
        assert!(matches_event_type(
            "order.paid",
            Some(&list(&["invoice.*", "order.paid"]))
        ));
    }

    #[test]
    fn small_entries_stay_plain_json_and_large_ones_compress() {
        let entry = BufferedEntry {
            events: vec![],
            deliveries: vec![],
        };
        let (field, bytes) = encode_entry(&entry).expect("encode");
        assert_eq!(field, ENTRY_FIELD_PLAIN);
        assert!(serde_json::from_slice::<BufferedEntry>(&bytes).is_ok());

        let big = BufferedEntry {
            events: vec![BufferedEvent {
                id: "e".to_owned(),
                organization_id: "o".to_owned(),
                event_type: "t".to_owned(),
                payload: serde_json::value::RawValue::from_string(format!(
                    r#"{{"d":"{}"}}"#,
                    "x".repeat(COMPRESS_THRESHOLD_BYTES)
                ))
                .expect("payload"),
                idempotency_key: None,
                created_at: "now".to_owned(),
            }],
            deliveries: vec![],
        };
        let (field, bytes) = encode_entry(&big).expect("encode");
        assert_eq!(field, ENTRY_FIELD_ZSTD);
        let decoded = decode_entry(field, &bytes).expect("decode");
        assert_eq!(decoded.events.len(), 1);
    }
}
