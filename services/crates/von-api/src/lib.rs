pub mod auth;
pub mod cipher;
pub mod error;
pub mod extract;
pub mod modules;
pub mod openapi;
pub mod pagination;
pub mod queue;
pub mod state;
pub mod url_safety;

use axum::{Json, Router, routing::get};
use utoipa::OpenApi;

pub use error::ApiError;
pub use state::{ApiState, Shared};

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
