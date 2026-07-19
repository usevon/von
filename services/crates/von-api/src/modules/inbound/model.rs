use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use von_error::{Error, Result};

pub const DEFAULT_MAX_ATTEMPTS: i32 = 4;
pub const DEFAULT_TIMEOUT_MS: i32 = 30_000;

const STATUSES: [&str; 3] = ["active", "paused", "disabled"];

fn invalid(message: &str) -> Error {
    Error::BadRequest(message.to_owned())
}

fn check_status(value: &Option<String>) -> Result<()> {
    match value {
        Some(status) if !STATUSES.contains(&status.as_str()) => {
            Err(invalid("status must be active, paused or disabled"))
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

fn check_lengths(name: &Option<String>, provider: &Option<String>) -> Result<()> {
    if name.as_ref().is_some_and(|v| v.chars().count() > 255) {
        return Err(invalid("name must be at most 255 characters"));
    }
    if provider.as_ref().is_some_and(|v| v.chars().count() > 100) {
        return Err(invalid("provider must be at most 100 characters"));
    }
    Ok(())
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateInboundEndpoint {
    #[schema(max_length = 255)]
    pub name: Option<String>,
    #[schema(max_length = 100)]
    pub provider: Option<String>,
    #[schema(format = "uri")]
    pub forward_url: String,
    #[schema(minimum = 1, maximum = 10)]
    pub max_attempts: Option<i32>,
    #[schema(minimum = 1000, maximum = 60000)]
    pub timeout_ms: Option<i32>,
    pub status: Option<String>,
}

impl CreateInboundEndpoint {
    pub fn validate(&self) -> Result<()> {
        check_lengths(&self.name, &self.provider)?;
        check_bounds(self.max_attempts, self.timeout_ms)?;
        check_status(&self.status)
    }
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInboundEndpoint {
    #[schema(max_length = 255)]
    pub name: Option<String>,
    #[schema(max_length = 100)]
    pub provider: Option<String>,
    #[schema(format = "uri")]
    pub forward_url: Option<String>,
    #[schema(minimum = 1, maximum = 10)]
    pub max_attempts: Option<i32>,
    #[schema(minimum = 1000, maximum = 60000)]
    pub timeout_ms: Option<i32>,
    pub status: Option<String>,
}

impl UpdateInboundEndpoint {
    pub fn validate(&self) -> Result<()> {
        check_lengths(&self.name, &self.provider)?;
        check_bounds(self.max_attempts, self.timeout_ms)?;
        check_status(&self.status)
    }
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct InboundEndpoint {
    #[schema(format = "uuid")]
    pub id: String,
    pub name: Option<String>,
    pub provider: Option<String>,
    pub secret: String,
    pub forward_url: String,
    pub status: String,
    pub max_attempts: i32,
    pub timeout_ms: i32,
    #[schema(format = "date-time")]
    pub last_success_at: Option<String>,
    #[schema(format = "date-time")]
    pub created_at: String,
    #[schema(format = "date-time")]
    pub updated_at: String,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct InboundEndpointList {
    pub endpoints: Vec<InboundEndpoint>,
    pub next_cursor: Option<String>,
}
