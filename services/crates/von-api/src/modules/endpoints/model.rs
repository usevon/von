use crate::ENDPOINT_STATUSES;
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use utoipa::ToSchema;
use von_error::{Error, Result};

/// Only describes the schema, since the wire fields stay strings so an unknown
/// status is answered with a validation message instead of a deserialize error.
#[derive(Serialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum EndpointStatus {
    Active,
    Paused,
    Disabled,
}

fn invalid(message: &str) -> Error {
    Error::BadRequest(message.to_owned())
}

/// Serde folds an explicit JSON null into a plain missing Option, so the three
/// state fields need the present-but-null case captured as Some(None).
fn double_option<'de, T, D>(deserializer: D) -> std::result::Result<Option<Option<T>>, D::Error>
where
    T: serde::Deserialize<'de>,
    D: serde::Deserializer<'de>,
{
    serde::Deserialize::deserialize(deserializer).map(Some)
}

fn check_description(value: Option<&String>) -> Result<()> {
    match value {
        Some(v) if v.chars().count() > 500 => {
            Err(invalid("description must be at most 500 characters"))
        }
        _ => Ok(()),
    }
}

fn check_version(value: Option<&String>) -> Result<()> {
    match value {
        Some(v) if v.chars().count() > 50 => Err(invalid("version must be at most 50 characters")),
        _ => Ok(()),
    }
}

fn check_status(value: Option<&String>) -> Result<()> {
    match value {
        Some(v) if !ENDPOINT_STATUSES.contains(&v.as_str()) => {
            Err(invalid("status must be one of active, paused, disabled"))
        }
        _ => Ok(()),
    }
}

fn check_bounds(max_attempts: Option<i32>, timeout_ms: Option<i32>) -> Result<()> {
    if let Some(attempts) = max_attempts
        && !(1..=10).contains(&attempts)
    {
        return Err(invalid("maxAttempts must be between 1 and 10"));
    }
    if let Some(timeout) = timeout_ms
        && !(1000..=60_000).contains(&timeout)
    {
        return Err(invalid("timeoutMs must be between 1000 and 60000"));
    }
    Ok(())
}

fn check_events(value: Option<&Vec<String>>) -> Result<()> {
    match value {
        Some(list) if list.iter().any(|e| e.chars().count() > 100) => {
            Err(invalid("each event must be at most 100 characters"))
        }
        _ => Ok(()),
    }
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CreateEndpoint {
    #[schema(format = "uri", example = "https://example.com/webhooks")]
    pub url: String,
    #[schema(max_length = 500)]
    pub description: Option<String>,
    #[schema(value_type = EndpointStatus, example = "active")]
    pub status: Option<String>,
    #[schema(max_length = 50)]
    pub version: Option<String>,
    #[schema(minimum = 1, maximum = 10, default = 4)]
    pub max_attempts: Option<i32>,
    #[schema(minimum = 1000, maximum = 60000, default = 30000)]
    pub timeout_ms: Option<i32>,
    pub events: Option<Vec<String>>,
}

impl CreateEndpoint {
    pub fn validate(&self) -> Result<()> {
        check_description(self.description.as_ref())?;
        check_status(self.status.as_ref())?;
        check_version(self.version.as_ref())?;
        check_bounds(self.max_attempts, self.timeout_ms)?;
        check_events(self.events.as_ref())
    }
}

/// The nullable fields are three state because absent keeps the stored value
/// while an explicit null clears it, which a plain Option cannot express.
#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct UpdateEndpoint {
    #[schema(format = "uri")]
    pub url: Option<String>,
    #[schema(max_length = 500)]
    pub description: Option<String>,
    #[schema(value_type = EndpointStatus)]
    pub status: Option<String>,
    #[serde(default, deserialize_with = "double_option")]
    #[schema(max_length = 50, nullable)]
    pub version: Option<Option<String>>,
    #[schema(minimum = 1, maximum = 10)]
    pub max_attempts: Option<i32>,
    #[schema(minimum = 1000, maximum = 60000)]
    pub timeout_ms: Option<i32>,
    #[serde(default, deserialize_with = "double_option")]
    #[schema(nullable)]
    pub events: Option<Option<Vec<String>>>,
}

impl UpdateEndpoint {
    pub fn validate(&self) -> Result<()> {
        check_description(self.description.as_ref())?;
        check_status(self.status.as_ref())?;
        check_version(self.version.as_ref().and_then(|v| v.as_ref()))?;
        check_bounds(self.max_attempts, self.timeout_ms)?;
        check_events(self.events.as_ref().and_then(|v| v.as_ref()))
    }
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Endpoint {
    #[schema(format = "uuid")]
    pub id: String,
    pub url: String,
    pub description: Option<String>,
    #[schema(value_type = EndpointStatus, example = "active")]
    pub status: String,
    pub version: Option<String>,
    pub max_attempts: i32,
    pub timeout_ms: i32,
    pub events: Option<Vec<String>>,
    #[schema(format = "date-time")]
    pub last_success_at: Option<String>,
    #[schema(format = "date-time")]
    pub created_at: String,
    #[schema(format = "date-time")]
    pub updated_at: String,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct EndpointWithSecret {
    #[serde(flatten)]
    #[schema(inline)]
    pub endpoint: Endpoint,
    pub secret: String,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct EndpointList {
    pub endpoints: Vec<Endpoint>,
    pub next_cursor: Option<String>,
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TestEndpointBody {
    #[serde(default)]
    #[schema(value_type = Object)]
    pub payload: Option<Box<RawValue>>,
    #[schema(max_length = 100)]
    pub event_type: Option<String>,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestResponse {
    #[schema(format = "uuid")]
    pub event_id: String,
    #[schema(format = "uuid")]
    pub delivery_id: String,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RotateResponse {
    pub secret: String,
    pub previous_secret: String,
}
