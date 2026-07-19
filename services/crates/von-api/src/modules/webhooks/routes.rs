use super::model::{
    DeliveryAttemptList, DeliveryAttemptQuery, DeliveryList, DeliveryQuery, EventList, EventQuery,
    WebhookEvent,
};
use super::replay::{BulkReplayBody, BulkReplayResult, ReplayBody, ReplayResult};
use super::service;
use crate::error::ApiError;
use crate::extract::Query;
use crate::state::Shared;
use axum::{
    Json, Router,
    extract::{Path, State},
    http::HeaderMap,
    routing::{get, post},
};
use von_error::Error;

pub fn router() -> Router<Shared> {
    Router::new()
        .route("/webhooks/events", get(list_events))
        .route("/webhooks/events/{id}", get(get_event))
        .route("/webhooks/events/{id}/deliveries", get(list_deliveries))
        .route("/webhooks/deliveries/{id}/attempts", get(list_attempts))
        .route("/webhooks/events/replay", post(replay_bulk))
        .route("/webhooks/events/{id}/replay", post(replay_event))
}

fn bearer(headers: &HeaderMap) -> Result<&str, Error> {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(Error::MissingCredentials)
}

#[utoipa::path(
    get,
    path = "/webhooks/events",
    tag = "webhooks",
    params(EventQuery),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "A page of events", body = EventList),
        (status = 400, description = "Invalid filter or cursor", body = crate::error::ErrorResponse),
        (status = 401, description = "Missing or invalid API key", body = crate::error::ErrorResponse),
    )
)]
pub async fn list_events(
    State(state): State<Shared>,
    headers: HeaderMap,
    Query(query): Query<EventQuery>,
) -> Result<Json<EventList>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "read:webhooks")
        .await?;
    Ok(Json(
        service::get_events(&state, &tenant.organization_id, &query).await?,
    ))
}

#[utoipa::path(
    get,
    path = "/webhooks/events/{id}",
    tag = "webhooks",
    params(("id" = String, Path, description = "Event id")),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "The event", body = WebhookEvent),
        (status = 404, description = "Event not found", body = crate::error::ErrorResponse),
    )
)]
pub async fn get_event(
    State(state): State<Shared>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<WebhookEvent>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "read:webhooks")
        .await?;
    service::get_event(&state, &tenant.organization_id, &id)
        .await?
        .map(Json)
        .ok_or_else(|| Error::NotFound("Event".to_owned()).into())
}

#[utoipa::path(
    get,
    path = "/webhooks/events/{id}/deliveries",
    tag = "webhooks",
    params(("id" = String, Path, description = "Event id"), DeliveryQuery),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "A page of deliveries for the event", body = DeliveryList),
        (status = 400, description = "Invalid filter or cursor", body = crate::error::ErrorResponse),
    )
)]
pub async fn list_deliveries(
    State(state): State<Shared>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Query(query): Query<DeliveryQuery>,
) -> Result<Json<DeliveryList>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "read:webhooks")
        .await?;
    Ok(Json(
        service::get_deliveries(&state, &tenant.organization_id, &id, &query).await?,
    ))
}

#[utoipa::path(
    get,
    path = "/webhooks/deliveries/{id}/attempts",
    tag = "webhooks",
    params(("id" = String, Path, description = "Delivery id"), DeliveryAttemptQuery),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "A page of delivery attempts", body = DeliveryAttemptList),
        (status = 400, description = "Invalid cursor", body = crate::error::ErrorResponse),
    )
)]
pub async fn list_attempts(
    State(state): State<Shared>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Query(query): Query<DeliveryAttemptQuery>,
) -> Result<Json<DeliveryAttemptList>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "read:webhooks")
        .await?;
    Ok(Json(
        service::get_delivery_attempts(&state, &tenant.organization_id, &id, &query).await?,
    ))
}

#[utoipa::path(
    post,
    path = "/webhooks/events/{id}/replay",
    tag = "webhooks",
    params(("id" = String, Path, description = "Event id")),
    request_body = ReplayBody,
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "The replayed deliveries", body = ReplayResult),
        (status = 404, description = "Event not found", body = crate::error::ErrorResponse),
    )
)]
pub async fn replay_event(
    State(state): State<Shared>,
    headers: HeaderMap,
    Path(id): Path<String>,
    body: Option<Json<ReplayBody>>,
) -> Result<Json<ReplayResult>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "write:webhooks")
        .await?;
    let body = body.map(|Json(b)| b).unwrap_or_default();
    Ok(Json(
        super::replay::replay_event(&state, &tenant, &id, body).await?,
    ))
}

#[utoipa::path(
    post,
    path = "/webhooks/events/replay",
    tag = "webhooks",
    request_body = BulkReplayBody,
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "How many deliveries were replayed", body = BulkReplayResult),
        (status = 400, description = "Invalid since date", body = crate::error::ErrorResponse),
    )
)]
pub async fn replay_bulk(
    State(state): State<Shared>,
    headers: HeaderMap,
    Json(body): Json<BulkReplayBody>,
) -> Result<Json<BulkReplayResult>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "write:webhooks")
        .await?;
    Ok(Json(
        super::replay::replay_bulk(&state, &tenant, body).await?,
    ))
}
