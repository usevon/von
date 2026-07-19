use super::model::{AnalyticsQuery, Overview, Retries, Timeseries, TimeseriesQuery};
use super::service;
use crate::error::ApiError;
use crate::state::Shared;
use axum::{
    Json, Router,
    extract::{Query, State},
    http::HeaderMap,
    routing::get,
};
use von_error::Error;

pub fn router() -> Router<Shared> {
    Router::new()
        .route("/analytics/overview", get(overview))
        .route("/analytics/timeseries", get(timeseries))
        .route("/analytics/retries", get(retries))
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
    path = "/analytics/overview",
    tag = "analytics",
    params(AnalyticsQuery),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Delivery and event totals with derived rates", body = Overview),
        (status = 400, description = "Invalid date range", body = crate::error::ErrorResponse),
        (status = 401, description = "Missing or invalid API key", body = crate::error::ErrorResponse),
    )
)]
pub async fn overview(
    State(state): State<Shared>,
    headers: HeaderMap,
    Query(query): Query<AnalyticsQuery>,
) -> Result<Json<Overview>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "read:analytics")
        .await?;
    Ok(Json(
        service::get_overview(&state, &tenant.organization_id, &query).await?,
    ))
}

#[utoipa::path(
    get,
    path = "/analytics/timeseries",
    tag = "analytics",
    params(TimeseriesQuery),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Delivery counts bucketed by interval", body = Timeseries),
        (status = 400, description = "Invalid date range or interval", body = crate::error::ErrorResponse),
        (status = 401, description = "Missing or invalid API key", body = crate::error::ErrorResponse),
    )
)]
pub async fn timeseries(
    State(state): State<Shared>,
    headers: HeaderMap,
    Query(query): Query<TimeseriesQuery>,
) -> Result<Json<Timeseries>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "read:analytics")
        .await?;
    Ok(Json(
        service::get_timeseries(&state, &tenant.organization_id, &query).await?,
    ))
}

#[utoipa::path(
    get,
    path = "/analytics/retries",
    tag = "analytics",
    params(AnalyticsQuery),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Retry totals, rates, and a per attempt breakdown", body = Retries),
        (status = 400, description = "Invalid date range", body = crate::error::ErrorResponse),
        (status = 401, description = "Missing or invalid API key", body = crate::error::ErrorResponse),
    )
)]
pub async fn retries(
    State(state): State<Shared>,
    headers: HeaderMap,
    Query(query): Query<AnalyticsQuery>,
) -> Result<Json<Retries>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "read:analytics")
        .await?;
    Ok(Json(
        service::get_retries(&state, &tenant.organization_id, &query).await?,
    ))
}
