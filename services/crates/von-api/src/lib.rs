pub mod auth;
pub mod cipher;
pub mod error;
pub mod extract;
pub mod modules;
pub mod openapi;
pub mod pagination;
pub mod quota;
pub mod state;
pub mod url_safety;

use axum::{Json, Router, routing::get};
use utoipa::OpenApi;

pub use error::ApiError;
pub use state::{ApiState, Shared};

// The retry defaults mirror the column defaults the schema migrations declare.
pub const DEFAULT_MAX_ATTEMPTS: i32 = 4;
pub const DEFAULT_TIMEOUT_MS: i32 = 30_000;

pub const ENDPOINT_STATUSES: [&str; 3] = ["active", "paused", "disabled"];

/// Matches the ISO string the TypeScript service returns so both services render
/// the same timestamp for a row.
pub fn to_iso(value: chrono::NaiveDateTime) -> String {
    value.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()
}

/// Accepts what `new Date(value)` accepts for the formats the dashboard sends,
/// treating a bare datetime as UTC because both services run with TZ=UTC.
pub fn parse_optional_date(
    value: Option<&String>,
    field: &str,
) -> von_error::Result<Option<chrono::NaiveDateTime>> {
    use chrono::{DateTime, NaiveDate, NaiveDateTime};

    let Some(value) = value.filter(|v| !v.is_empty()) else {
        return Ok(None);
    };

    if let Ok(parsed) = DateTime::parse_from_rfc3339(value) {
        return Ok(Some(parsed.naive_utc()));
    }
    if let Ok(parsed) = NaiveDateTime::parse_from_str(value, "%Y-%m-%dT%H:%M:%S%.f") {
        return Ok(Some(parsed));
    }
    if let Ok(parsed) = NaiveDateTime::parse_from_str(value, "%Y-%m-%dT%H:%M") {
        return Ok(Some(parsed));
    }
    if let Ok(parsed) = NaiveDate::parse_from_str(value, "%Y-%m-%d") {
        return Ok(Some(parsed.and_hms_opt(0, 0, 0).unwrap_or_default()));
    }

    Err(von_error::Error::BadRequest(format!(
        "Invalid {field} date"
    )))
}

pub fn validate_range(
    from: Option<chrono::NaiveDateTime>,
    to: Option<chrono::NaiveDateTime>,
) -> von_error::Result<()> {
    match (from, to) {
        (Some(from), Some(to)) if from > to => Err(von_error::Error::BadRequest(
            "from must be before or equal to to".to_owned(),
        )),
        _ => Ok(()),
    }
}

async fn openapi_json() -> Json<utoipa::openapi::OpenApi> {
    Json(openapi::ApiDoc::openapi())
}

/// Control plane routes, kept separate from the ingest router so the two can be
/// mounted in one process today and split into separate services later.
pub fn router() -> Router<Shared> {
    Router::new()
        .merge(modules::endpoints::router())
        .merge(modules::analytics::router())
        .merge(modules::versions::router())
        .merge(modules::webhooks::router())
        .merge(modules::inbound::router())
        .merge(modules::tunnel::router())
        .route("/openapi.json", get(openapi_json))
}
