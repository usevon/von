use crate::error::ApiError;
use crate::queue::reserve_quota;
use crate::state::{ApiState, Shared};
use axum::{
    Json,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
};
use serde::Serialize;
use sqlx::Row;
use std::collections::HashMap;
use utoipa::ToSchema;
use von_error::{Error, Result};
use von_types::MAX_PAYLOAD_BYTES;

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct InboundDelivery {
    #[schema(format = "uuid")]
    pub id: String,
    #[schema(value_type = Object)]
    pub payload: serde_json::Value,
    pub headers: Option<HashMap<String, String>>,
    pub status: String,
    pub forwarded_at: Option<String>,
    #[schema(value_type = Object)]
    pub response: Option<serde_json::Value>,
    #[schema(format = "date-time")]
    pub created_at: String,
}

struct Target {
    organization_id: String,
    status: String,
    monthly_limit: i64,
    has_overage: bool,
}

async fn load_target(state: &ApiState, endpoint_id: &str) -> Result<Option<Target>> {
    let row = sqlx::query(
        "SELECT i.organization_id::text AS organization_id, i.status, o.plan \
         FROM inbound_endpoint i JOIN organization o ON o.id = i.organization_id \
         WHERE i.id = $1::uuid LIMIT 1",
    )
    .bind(endpoint_id)
    .fetch_optional(&state.pool)
    .await?;

    let Some(row) = row else {
        return Ok(None);
    };
    let plan: String = row.try_get("plan").unwrap_or_else(|_| "hobby".to_owned());
    let (monthly_limit, has_overage) = match plan.as_str() {
        "free" | "hobby" => (50_000, false),
        "growth" => (1_000_000, true),
        "scale" => (10_000_000, true),
        "enterprise" => (i64::MAX, true),
        _ => (250_000, true),
    };

    Ok(Some(Target {
        organization_id: row.try_get("organization_id")?,
        status: row.try_get("status")?,
        monthly_limit,
        has_overage,
    }))
}

pub async fn handler(
    State(state): State<Shared>,
    Path(id): Path<String>,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> std::result::Result<Response, ApiError> {
    if body.len() > MAX_PAYLOAD_BYTES {
        return Err(Error::PayloadTooLarge {
            limit: MAX_PAYLOAD_BYTES,
            actual: body.len(),
        }
        .into());
    }

    let Some(target) = load_target(&state, &id).await? else {
        return Err(Error::NotFound("Endpoint".to_owned()).into());
    };
    if target.status != "active" {
        return Err(Error::InsufficientScope("Endpoint is not active".to_owned()).into());
    }

    let payload: serde_json::Value =
        serde_json::from_slice(&body).unwrap_or(serde_json::Value::Null);
    let forwarded: HashMap<String, String> = headers
        .iter()
        .filter_map(|(name, value)| {
            Some((name.as_str().to_owned(), value.to_str().ok()?.to_owned()))
        })
        .collect();

    reserve_quota(
        &state,
        &target.organization_id,
        target.monthly_limit,
        target.has_overage,
        1,
    )
    .await?;

    // The pending row with next_attempt_at defaulting to now() is the enqueue, the forwarder polls it.
    let delivery_id = uuid::Uuid::new_v4();
    let row = sqlx::query(
        "INSERT INTO inbound_delivery (id, inbound_endpoint_id, payload, headers, status, created_at) \
         VALUES ($1, $2::uuid, $3, $4, 'pending', now()) RETURNING created_at",
    )
    .bind(delivery_id)
    .bind(&id)
    .bind(&payload)
    .bind(serde_json::to_value(&forwarded).unwrap_or(serde_json::Value::Null))
    .fetch_one(&state.pool)
    .await
    .map_err(Error::from)?;

    let created_at: chrono::NaiveDateTime = row.try_get("created_at").map_err(Error::from)?;
    Ok((
        StatusCode::OK,
        Json(InboundDelivery {
            id: delivery_id.to_string(),
            payload,
            headers: Some(forwarded),
            status: "pending".to_owned(),
            forwarded_at: None,
            response: None,
            created_at: created_at.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
        }),
    )
        .into_response())
}
