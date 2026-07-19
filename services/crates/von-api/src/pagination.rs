use chrono::{DateTime, TimeZone, Utc};
use hmac::{Hmac, Mac};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::sync::OnceLock;
use von_error::{Error, Result};

const CURSOR_VERSION: &str = "v1";
const SIGNATURE_LENGTH: usize = 24;
const SCOPE_HASH_LENGTH: usize = 16;
const MAX_LENGTH: usize = 256;
const DEFAULT_LIMIT: i64 = 20;
const MAX_LIMIT: i64 = 100;

static SIGNING_SECRET: OnceLock<Option<String>> = OnceLock::new();

fn signing_secret() -> Result<&'static str> {
    SIGNING_SECRET
        .get_or_init(|| std::env::var("BETTER_AUTH_SECRET").ok())
        .as_deref()
        .ok_or_else(|| Error::Configuration("BETTER_AUTH_SECRET is required".to_owned()))
}

#[derive(Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct PaginationQuery {
    /// Maximum items to return, defaults to 20.
    #[param(minimum = 1, maximum = 100, example = 20)]
    pub limit: Option<i64>,
    /// Opaque cursor from a previous response's nextCursor.
    pub cursor: Option<String>,
}

pub fn clamp_limit(limit: Option<i64>) -> i64 {
    limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT)
}

impl PaginationQuery {
    pub fn limit(&self) -> i64 {
        clamp_limit(self.limit)
    }
}

pub struct CursorPosition {
    pub created_at: DateTime<Utc>,
    pub id: String,
}

fn to_base36(mut value: u64) -> String {
    const ALPHABET: &[u8] = b"0123456789abcdefghijklmnopqrstuvwxyz";
    if value == 0 {
        return "0".to_owned();
    }
    let mut out = Vec::new();
    while value > 0 {
        out.push(ALPHABET[(value % 36) as usize]);
        value /= 36;
    }
    out.reverse();
    String::from_utf8(out).unwrap_or_default()
}

fn from_base36(value: &str) -> Option<i64> {
    let mut out: i64 = 0;
    for byte in value.bytes() {
        let digit = match byte {
            b'0'..=b'9' => i64::from(byte - b'0'),
            b'a'..=b'z' => i64::from(byte - b'a') + 10,
            b'A'..=b'Z' => i64::from(byte - b'A') + 10,
            _ => return None,
        };
        out = out.checked_mul(36)?.checked_add(digit)?;
    }
    Some(out)
}

fn sign(unsigned: &str) -> Result<String> {
    let mut mac = Hmac::<Sha256>::new_from_slice(signing_secret()?.as_bytes())
        .map_err(|_| Error::Configuration("invalid cursor signing secret".to_owned()))?;
    mac.update(unsigned.as_bytes());
    let mut hex = hex::encode(mac.finalize().into_bytes());
    hex.truncate(SIGNATURE_LENGTH);
    Ok(hex)
}

/// Must match the TypeScript scope hash byte for byte, which hashes the JSON
/// object with its keys in declaration order rather than sorted.
pub fn scope_hash_json(json: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(json.as_bytes());
    let mut hex = hex::encode(hasher.finalize());
    hex.truncate(SCOPE_HASH_LENGTH);
    hex
}

pub fn scope_hash(resource: &str, organization_id: &str) -> String {
    scope_hash_json(&format!(
        "{{\"resource\":\"{resource}\",\"organizationId\":\"{organization_id}\"}}"
    ))
}

fn is_uuid(value: &str) -> bool {
    uuid::Uuid::parse_str(value).is_ok() && value.len() == 36
}

pub fn encode_cursor(position: &CursorPosition, scope: &str) -> Result<String> {
    let millis = position.created_at.timestamp_millis();
    if millis < 0 {
        return Err(Error::BadRequest("Invalid cursor".to_owned()));
    }
    let unsigned = format!(
        "{CURSOR_VERSION}.{}.{}.d.{scope}",
        to_base36(millis as u64),
        position.id
    );
    let signature = sign(&unsigned)?;
    Ok(format!("{unsigned}.{signature}"))
}

/// Only the descending direction is used by the ported list routes, so the
/// direction segment is validated against it rather than being a parameter.
pub fn decode_cursor(cursor: Option<&str>, scope: &str) -> Result<Option<CursorPosition>> {
    let Some(cursor) = cursor.filter(|c| !c.is_empty()) else {
        return Ok(None);
    };

    let invalid = || Error::BadRequest("Invalid cursor".to_owned());

    if cursor.len() > MAX_LENGTH {
        return Err(invalid());
    }

    let parts: Vec<&str> = cursor.split('.').collect();
    let [version, timestamp, id, direction, cursor_scope, signature] = parts[..] else {
        return Err(invalid());
    };

    if version != CURSOR_VERSION || !is_uuid(id) || direction != "d" {
        return Err(invalid());
    }
    if cursor_scope.len() != SCOPE_HASH_LENGTH
        || !cursor_scope.bytes().all(|b| b.is_ascii_hexdigit())
        || signature.len() != SIGNATURE_LENGTH
        || !signature.bytes().all(|b| b.is_ascii_hexdigit())
    {
        return Err(invalid());
    }

    let unsigned = format!("{version}.{timestamp}.{id}.{direction}.{cursor_scope}");
    let expected = sign(&unsigned)?;
    let matches = expected.len() == signature.len()
        && expected
            .bytes()
            .zip(signature.bytes())
            .fold(0u8, |acc, (a, b)| acc | (a ^ b))
            == 0;
    if !matches || cursor_scope != scope {
        return Err(invalid());
    }

    let millis = from_base36(timestamp).ok_or_else(invalid)?;
    let created_at = Utc
        .timestamp_millis_opt(millis)
        .single()
        .ok_or_else(invalid)?;

    Ok(Some(CursorPosition {
        created_at,
        id: id.to_owned(),
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base36_matches_javascript() {
        assert_eq!(to_base36(0), "0");
        assert_eq!(to_base36(35), "z");
        assert_eq!(to_base36(1_700_000_000_000), "loyw3v28");
        assert_eq!(from_base36("loyw3v28"), Some(1_700_000_000_000));
    }

    #[test]
    fn round_trips_a_cursor() {
        unsafe { std::env::set_var("BETTER_AUTH_SECRET", "test-secret") };
        let scope = scope_hash("endpoints", "org-1");
        let position = CursorPosition {
            created_at: Utc.timestamp_millis_opt(1_700_000_000_000).unwrap(),
            id: "3f7c1a2e-5b6d-4e8f-9a0b-1c2d3e4f5a6b".to_owned(),
        };
        let encoded = encode_cursor(&position, &scope).expect("encode");
        let decoded = decode_cursor(Some(&encoded), &scope)
            .expect("decode")
            .expect("some");
        assert_eq!(decoded.id, position.id);
        assert_eq!(decoded.created_at, position.created_at);
    }

    #[test]
    fn rejects_a_cursor_from_another_scope() {
        unsafe { std::env::set_var("BETTER_AUTH_SECRET", "test-secret") };
        let position = CursorPosition {
            created_at: Utc.timestamp_millis_opt(1_700_000_000_000).unwrap(),
            id: "3f7c1a2e-5b6d-4e8f-9a0b-1c2d3e4f5a6b".to_owned(),
        };
        let encoded = encode_cursor(&position, &scope_hash("endpoints", "org-1")).expect("encode");
        assert!(decode_cursor(Some(&encoded), &scope_hash("endpoints", "org-2")).is_err());
    }
}
