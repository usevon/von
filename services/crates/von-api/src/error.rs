use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use std::sync::Arc;
use von_error::Error;

/// Wrapper so handlers return the shared error type directly and it carries its
/// own status code and message into the response.
pub struct ApiError(Arc<Error>);

impl From<Error> for ApiError {
    fn from(err: Error) -> Self {
        Self(Arc::new(err))
    }
}

impl From<Arc<Error>> for ApiError {
    fn from(err: Arc<Error>) -> Self {
        Self(err)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status =
            StatusCode::from_u16(self.0.status_code()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        let body = serde_json::json!({
            "error": {
                "message": self.0.to_string(),
                "retryable": self.0.is_retryable(),
            }
        });
        (status, Json(body)).into_response()
    }
}

#[derive(serde::Serialize, utoipa::ToSchema)]
pub struct ErrorBody {
    pub message: String,
    pub retryable: bool,
}

#[derive(serde::Serialize, utoipa::ToSchema)]
#[schema(as = ErrorResponse)]
pub struct ErrorResponse {
    pub error: ErrorBody,
}

#[derive(serde::Serialize, utoipa::ToSchema)]
pub struct SuccessResponse {
    pub success: bool,
}
