use super::model::{
    CreateEndpoint, Endpoint, EndpointList, EndpointWithSecret, RotateResponse, TestEndpointBody,
    TestResponse, UpdateEndpoint,
};
use super::service;
use crate::error::{ApiError, SuccessResponse};
use crate::pagination::PaginationQuery;
use crate::state::Shared;
use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    routing::{delete, get, post},
};
use von_error::Error;

pub fn router() -> Router<Shared> {
    Router::new()
        .route("/endpoints", get(list).post(create))
        .route("/endpoints/{id}", get(get_one).patch(update).delete(remove))
        .route("/endpoints/{id}/test", post(test))
        .route("/endpoints/{id}/rotate", post(rotate))
        .route("/endpoints/{id}/previous-secret", delete(clear_previous))
}

fn bearer(headers: &HeaderMap) -> Result<&str, Error> {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(Error::MissingCredentials)
}

fn not_found() -> Error {
    Error::NotFound("Endpoint".to_owned())
}

#[utoipa::path(
    get,
    path = "/endpoints",
    tag = "endpoints",
    params(PaginationQuery),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "A page of endpoints", body = EndpointList),
        (status = 401, description = "Missing or invalid API key", body = crate::error::ErrorResponse),
    )
)]
pub async fn list(
    State(state): State<Shared>,
    headers: HeaderMap,
    Query(pagination): Query<PaginationQuery>,
) -> Result<Json<EndpointList>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "read:endpoints")
        .await?;
    Ok(Json(
        service::get_all(&state, &tenant.organization_id, &pagination).await?,
    ))
}

#[utoipa::path(
    get,
    path = "/endpoints/{id}",
    tag = "endpoints",
    params(("id" = String, Path, format = "uuid", description = "Endpoint id")),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "The endpoint", body = Endpoint),
        (status = 404, description = "Endpoint not found", body = crate::error::ErrorResponse),
    )
)]
pub async fn get_one(
    State(state): State<Shared>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Endpoint>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "read:endpoints")
        .await?;
    service::get_by_id(&state, &tenant.organization_id, &id)
        .await?
        .map(Json)
        .ok_or_else(|| not_found().into())
}

#[utoipa::path(
    post,
    path = "/endpoints",
    tag = "endpoints",
    request_body = CreateEndpoint,
    security(("bearerAuth" = [])),
    responses(
        (status = 201, description = "The created endpoint and its plaintext signing secret", body = EndpointWithSecret),
        (status = 400, description = "Validation or url safety failure", body = crate::error::ErrorResponse),
    )
)]
pub async fn create(
    State(state): State<Shared>,
    headers: HeaderMap,
    Json(body): Json<CreateEndpoint>,
) -> Result<(StatusCode, Json<EndpointWithSecret>), ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "write:endpoints")
        .await?;
    let created = service::create(&state, &tenant.organization_id, body).await?;
    Ok((StatusCode::CREATED, Json(created)))
}

#[utoipa::path(
    patch,
    path = "/endpoints/{id}",
    tag = "endpoints",
    params(("id" = String, Path, format = "uuid", description = "Endpoint id")),
    request_body = UpdateEndpoint,
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "The updated endpoint", body = Endpoint),
        (status = 404, description = "Endpoint not found", body = crate::error::ErrorResponse),
    )
)]
pub async fn update(
    State(state): State<Shared>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(body): Json<UpdateEndpoint>,
) -> Result<Json<Endpoint>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "write:endpoints")
        .await?;
    service::update(&state, &tenant.organization_id, &id, body)
        .await?
        .map(Json)
        .ok_or_else(|| not_found().into())
}

#[utoipa::path(
    delete,
    path = "/endpoints/{id}",
    tag = "endpoints",
    params(("id" = String, Path, format = "uuid", description = "Endpoint id")),
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
        .resolve_scoped(bearer(&headers)?, "write:endpoints")
        .await?;
    service::delete(&state, &tenant.organization_id, &id).await?;
    Ok(Json(SuccessResponse { success: true }))
}

#[utoipa::path(
    post,
    path = "/endpoints/{id}/test",
    tag = "endpoints",
    params(("id" = String, Path, format = "uuid", description = "Endpoint id")),
    request_body = TestEndpointBody,
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "The test event and delivery that were queued", body = TestResponse),
        (status = 404, description = "Endpoint not found", body = crate::error::ErrorResponse),
    )
)]
pub async fn test(
    State(state): State<Shared>,
    headers: HeaderMap,
    Path(id): Path<String>,
    body: Option<Json<TestEndpointBody>>,
) -> Result<Json<TestResponse>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "write:endpoints")
        .await?;
    let body = body.map(|Json(b)| b);
    let (payload, event_type) = match body {
        Some(b) => (b.payload, b.event_type),
        None => (None, None),
    };
    Ok(Json(
        service::test_endpoint(&state, &tenant, &id, payload, event_type).await?,
    ))
}

#[utoipa::path(
    post,
    path = "/endpoints/{id}/rotate",
    tag = "endpoints",
    params(("id" = String, Path, format = "uuid", description = "Endpoint id")),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "The new secret and the one it replaced", body = RotateResponse),
        (status = 404, description = "Endpoint not found", body = crate::error::ErrorResponse),
    )
)]
pub async fn rotate(
    State(state): State<Shared>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<RotateResponse>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "write:endpoints")
        .await?;
    Ok(Json(
        service::rotate_secret(&state, &tenant.organization_id, &id).await?,
    ))
}

#[utoipa::path(
    delete,
    path = "/endpoints/{id}/previous-secret",
    tag = "endpoints",
    params(("id" = String, Path, format = "uuid", description = "Endpoint id")),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "The previous secret was dropped", body = SuccessResponse),
        (status = 404, description = "Endpoint not found", body = crate::error::ErrorResponse),
    )
)]
pub async fn clear_previous(
    State(state): State<Shared>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<SuccessResponse>, ApiError> {
    let tenant = state
        .auth
        .resolve_scoped(bearer(&headers)?, "write:endpoints")
        .await?;
    service::clear_previous_secret(&state, &tenant.organization_id, &id).await?;
    Ok(Json(SuccessResponse { success: true }))
}
