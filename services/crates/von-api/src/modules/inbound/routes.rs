use super::model::{
    CreateInboundEndpoint, InboundEndpoint, InboundEndpointList, UpdateInboundEndpoint,
};
use super::service;
use crate::error::{ApiError, SuccessResponse};
use crate::extract::{Query, bearer};
use crate::pagination::PaginationQuery;
use crate::state::Shared;
use axum::{
    Json, Router,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    routing::get,
};
use von_error::Error;

pub fn router() -> Router<Shared> {
    Router::new()
        .route("/inbound", get(list).post(create))
        .route("/inbound/{id}", get(get_one).patch(update).delete(remove))
        .route("/in/{id}", axum::routing::post(super::receive::handler))
}

fn not_found() -> Error {
    Error::NotFound("Endpoint".to_owned())
}

#[utoipa::path(
    get,
    path = "/inbound",
    tag = "inbound",
    params(PaginationQuery),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "A page of inbound endpoints", body = InboundEndpointList),
        (status = 401, description = "Missing or invalid API key", body = crate::error::ErrorResponse),
    )
)]
pub async fn list(
    State(state): State<Shared>,
    headers: HeaderMap,
    Query(pagination): Query<PaginationQuery>,
) -> Result<Json<InboundEndpointList>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "read:inbound")
        .await?;
    Ok(Json(
        service::get_all(&state, &tenant.organization_id, &pagination).await?,
    ))
}

#[utoipa::path(
    get,
    path = "/inbound/{id}",
    tag = "inbound",
    params(("id" = String, Path, description = "Inbound endpoint id")),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "The inbound endpoint", body = InboundEndpoint),
        (status = 404, description = "Endpoint not found", body = crate::error::ErrorResponse),
    )
)]
pub async fn get_one(
    State(state): State<Shared>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<InboundEndpoint>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "read:inbound")
        .await?;
    service::get_by_id(&state, &tenant.organization_id, &id)
        .await?
        .map(Json)
        .ok_or_else(|| not_found().into())
}

#[utoipa::path(
    post,
    path = "/inbound",
    tag = "inbound",
    request_body = CreateInboundEndpoint,
    security(("bearerAuth" = [])),
    responses(
        (status = 201, description = "The created inbound endpoint", body = InboundEndpoint),
        (status = 400, description = "Validation failure", body = crate::error::ErrorResponse),
    )
)]
pub async fn create(
    State(state): State<Shared>,
    headers: HeaderMap,
    Json(body): Json<CreateInboundEndpoint>,
) -> Result<(StatusCode, Json<InboundEndpoint>), ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "write:inbound")
        .await?;
    let created = service::create(&state, &tenant.organization_id, body).await?;
    Ok((StatusCode::CREATED, Json(created)))
}

#[utoipa::path(
    patch,
    path = "/inbound/{id}",
    tag = "inbound",
    params(("id" = String, Path, description = "Inbound endpoint id")),
    request_body = UpdateInboundEndpoint,
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "The updated inbound endpoint", body = InboundEndpoint),
        (status = 404, description = "Endpoint not found", body = crate::error::ErrorResponse),
    )
)]
pub async fn update(
    State(state): State<Shared>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(body): Json<UpdateInboundEndpoint>,
) -> Result<Json<InboundEndpoint>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "write:inbound")
        .await?;
    service::update(&state, &tenant.organization_id, &id, body)
        .await?
        .map(Json)
        .ok_or_else(|| not_found().into())
}

#[utoipa::path(
    delete,
    path = "/inbound/{id}",
    tag = "inbound",
    params(("id" = String, Path, description = "Inbound endpoint id")),
    security(("bearerAuth" = [])),
    responses((status = 200, description = "The endpoint was deleted", body = SuccessResponse))
)]
pub async fn remove(
    State(state): State<Shared>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<SuccessResponse>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "write:inbound")
        .await?;
    service::delete(&state, &tenant.organization_id, &id).await?;
    Ok(Json(SuccessResponse { success: true }))
}
