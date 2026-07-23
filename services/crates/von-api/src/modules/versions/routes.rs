use super::model::{CreateVersion, UpdateVersion, VersionList, WebhookVersion};
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
        .route("/versions", get(list).post(create))
        .route(
            "/versions/{version}",
            get(get_one).patch(update).delete(remove),
        )
}

fn not_found() -> Error {
    Error::NotFound("Version".to_owned())
}

#[utoipa::path(
    get,
    path = "/versions",
    tag = "versions",
    params(PaginationQuery),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "A page of webhook versions", body = VersionList),
        (status = 401, description = "Missing or invalid API key", body = crate::error::ErrorResponse),
    )
)]
pub async fn list(
    State(state): State<Shared>,
    headers: HeaderMap,
    Query(pagination): Query<PaginationQuery>,
) -> Result<Json<VersionList>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "read:versions")
        .await?;
    Ok(Json(
        service::get_all(&state, &tenant.organization_id, &pagination).await?,
    ))
}

#[utoipa::path(
    get,
    path = "/versions/{version}",
    tag = "versions",
    params(("version" = String, Path, description = "Version name")),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "The webhook version", body = WebhookVersion),
        (status = 404, description = "Version not found", body = crate::error::ErrorResponse),
    )
)]
pub async fn get_one(
    State(state): State<Shared>,
    headers: HeaderMap,
    Path(version): Path<String>,
) -> Result<Json<WebhookVersion>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "read:versions")
        .await?;
    service::get_by_version(&state, &tenant.organization_id, &version)
        .await?
        .map(Json)
        .ok_or_else(|| not_found().into())
}

#[utoipa::path(
    post,
    path = "/versions",
    tag = "versions",
    request_body = CreateVersion,
    security(("bearerAuth" = [])),
    responses(
        (status = 201, description = "The created webhook version", body = WebhookVersion),
        (status = 400, description = "Validation failure", body = crate::error::ErrorResponse),
    )
)]
pub async fn create(
    State(state): State<Shared>,
    headers: HeaderMap,
    Json(body): Json<CreateVersion>,
) -> Result<(StatusCode, Json<WebhookVersion>), ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "write:versions")
        .await?;
    let created = service::create(&state, &tenant.organization_id, body).await?;
    Ok((StatusCode::CREATED, Json(created)))
}

#[utoipa::path(
    patch,
    path = "/versions/{version}",
    tag = "versions",
    params(("version" = String, Path, description = "Version name")),
    request_body = UpdateVersion,
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "The updated webhook version", body = WebhookVersion),
        (status = 404, description = "Version not found", body = crate::error::ErrorResponse),
    )
)]
pub async fn update(
    State(state): State<Shared>,
    headers: HeaderMap,
    Path(version): Path<String>,
    Json(body): Json<UpdateVersion>,
) -> Result<Json<WebhookVersion>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "write:versions")
        .await?;
    service::update(&state, &tenant.organization_id, &version, body)
        .await?
        .map(Json)
        .ok_or_else(|| not_found().into())
}

#[utoipa::path(
    delete,
    path = "/versions/{version}",
    tag = "versions",
    params(("version" = String, Path, description = "Version name")),
    security(("bearerAuth" = [])),
    responses((status = 200, description = "The version was deleted", body = SuccessResponse))
)]
pub async fn remove(
    State(state): State<Shared>,
    headers: HeaderMap,
    Path(version): Path<String>,
) -> Result<Json<SuccessResponse>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "write:versions")
        .await?;
    service::delete(&state, &tenant.organization_id, &version).await?;
    Ok(Json(SuccessResponse { success: true }))
}
