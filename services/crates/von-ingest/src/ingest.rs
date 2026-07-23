use crate::AppState;
use crate::coalesce::IncomingEvent;
use axum::{Json, extract::State, http::HeaderMap};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::sync::Arc;
use von_api::ApiError;
use von_api::extract::bearer;
use von_error::Error;
use von_types::{CreatedEvent, MAX_PAYLOAD_BYTES, billable_units};

type Shared = Arc<AppState>;

#[derive(Deserialize)]
pub struct SendEvent {
    #[serde(rename = "eventType")]
    event_type: String,
    payload: Box<RawValue>,
    #[serde(rename = "idempotencyKey")]
    idempotency_key: Option<String>,
}

#[derive(Deserialize)]
pub struct SendBatch {
    events: Vec<SendEvent>,
}

#[derive(Serialize)]
pub struct BatchResponse {
    created: usize,
    events: Vec<CreatedEvent>,
}

async fn ingest(
    state: Shared,
    headers: HeaderMap,
    events: Vec<SendEvent>,
) -> Result<Json<BatchResponse>, ApiError> {
    if state.coalescer.is_draining() {
        return Err(Error::Shutdown.into());
    }
    let key = bearer(&headers)?;
    let tenant = state.auth.resolve(key).await?;

    if let Some(meter) = &state.meter
        && meter.is_over_limit(&tenant.organization_id)
    {
        return Err(Error::QuotaExceeded {
            used: tenant.monthly_limit,
            limit: tenant.monthly_limit,
        }
        .into());
    }

    // The stream is capped by entry count, not bytes, so an unbounded payload can
    // exhaust Redis memory and stall ingest for every tenant.
    let incoming: Vec<IncomingEvent> = events
        .into_iter()
        .map(|e| IncomingEvent {
            payload_bytes: e.payload.get().len(),
            event_type: e.event_type,
            payload: e.payload,
            idempotency_key: e.idempotency_key,
        })
        .collect();

    if let Some(oversized) = incoming
        .iter()
        .find(|e| e.payload_bytes > MAX_PAYLOAD_BYTES)
    {
        return Err(Error::PayloadTooLarge {
            limit: MAX_PAYLOAD_BYTES,
            actual: oversized.payload_bytes,
        }
        .into());
    }

    let units: u64 = incoming
        .iter()
        .map(|e| u64::from(billable_units(e.payload_bytes)))
        .sum();
    let organization_id = tenant.organization_id.clone();

    let created = state
        .coalescer
        .submit(tenant, incoming)
        .await
        .map_err(|_| Error::FlushDropped)??;

    if let Some(meter) = &state.meter {
        meter.record(&organization_id, units);
    }

    Ok(Json(BatchResponse {
        created: created.len(),
        events: created,
    }))
}

pub async fn post_webhook(
    State(state): State<Shared>,
    headers: HeaderMap,
    Json(event): Json<SendEvent>,
) -> Result<Json<BatchResponse>, ApiError> {
    ingest(state, headers, vec![event]).await
}

pub async fn post_batch(
    State(state): State<Shared>,
    headers: HeaderMap,
    Json(batch): Json<SendBatch>,
) -> Result<Json<BatchResponse>, ApiError> {
    ingest(state, headers, batch.events).await
}

pub async fn live() -> &'static str {
    "ok"
}

/// Verifies the dependencies a request needs so the load balancer pulls a node that cannot serve.
pub async fn ready(State(state): State<Shared>) -> Result<&'static str, ApiError> {
    if state.coalescer.is_draining() || !state.coalescer.is_healthy() {
        return Err(Error::Shutdown.into());
    }
    state.auth.ping().await?;
    state.redis.ping().await?;
    Ok("ok")
}
