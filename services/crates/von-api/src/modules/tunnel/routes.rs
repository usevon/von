use super::model::{RegisterResponse, RegisterTunnel, RotateResponse, TunnelList};
use super::service;
use crate::error::ApiError;
use crate::state::Shared;
use axum::{
    Json, Router,
    extract::{Path, State},
    http::HeaderMap,
    routing::{any, get, post},
};
use von_error::Error;

pub fn router() -> Router<Shared> {
    Router::new()
        .route("/register", post(register))
        .route("/rotate/{tunnel_id}", post(rotate))
        .route("/tunnels", get(list))
        .route("/ws/{tunnel_id}", get(super::ws::handler))
        .route("/t/{tunnel_id}", any(super::proxy::handler))
        .route("/t/{tunnel_id}/", any(super::proxy::handler))
        .route("/t/{tunnel_id}/{*rest}", any(super::proxy::handler))
}

fn bearer(headers: &HeaderMap) -> Result<&str, Error> {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(Error::MissingCredentials)
}

#[utoipa::path(
    post,
    path = "/register",
    tag = "tunnels",
    request_body = RegisterTunnel,
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "The tunnel and its secret", body = RegisterResponse),
        (status = 400, description = "Tunnel limit reached", body = crate::error::ErrorResponse),
    )
)]
pub async fn register(
    State(state): State<Shared>,
    headers: HeaderMap,
    Json(body): Json<RegisterTunnel>,
) -> Result<Json<RegisterResponse>, ApiError> {
    let principal = state
        .auth
        .resolve_principal_scoped(bearer(&headers)?, "write:tunnels")
        .await?;
    Ok(Json(
        service::register(
            &state,
            &principal.organization_id,
            &principal.user_id,
            body.port,
        )
        .await?,
    ))
}

#[utoipa::path(
    post,
    path = "/rotate/{tunnel_id}",
    tag = "tunnels",
    params(("tunnel_id" = String, Path, description = "Tunnel id")),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "The replacement secret", body = RotateResponse),
        (status = 404, description = "Tunnel not found", body = crate::error::ErrorResponse),
    )
)]
pub async fn rotate(
    State(state): State<Shared>,
    headers: HeaderMap,
    Path(tunnel_id): Path<String>,
) -> Result<Json<RotateResponse>, ApiError> {
    let principal = state
        .auth
        .resolve_principal_scoped(bearer(&headers)?, "write:tunnels")
        .await?;
    service::rotate(
        &state,
        &principal.organization_id,
        &principal.user_id,
        &tunnel_id,
    )
    .await?
    .map(Json)
    .ok_or_else(|| Error::NotFound("Tunnel".to_owned()).into())
}

#[utoipa::path(
    get,
    path = "/tunnels",
    tag = "tunnels",
    security(("bearerAuth" = [])),
    responses((status = 200, description = "Currently connected tunnels", body = TunnelList))
)]
pub async fn list(
    State(state): State<Shared>,
    headers: HeaderMap,
) -> Result<Json<TunnelList>, ApiError> {
    let principal = state
        .auth
        .resolve_principal_scoped(bearer(&headers)?, "read:tunnels")
        .await?;
    Ok(Json(TunnelList {
        tunnels: service::active_tunnels(&state, &principal.organization_id).await?,
    }))
}
