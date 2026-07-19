use crate::error::ApiError;
use axum::extract::{FromRequestParts, OptionalFromRequestParts};
use axum::http::request::Parts;
use serde::de::DeserializeOwned;
use von_error::Error;

/// Axum's own Query rejects repeated keys and answers with a bare string body.
/// This one reads them into a sequence the way Elysia does and fails with the
/// shared error envelope.
pub struct Query<T>(pub T);

impl<T, S> FromRequestParts<S> for Query<T>
where
    T: DeserializeOwned,
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let query = parts.uri.query().unwrap_or_default();
        serde_html_form::from_str(query)
            .map(Self)
            .map_err(|err| Error::BadRequest(err.to_string()).into())
    }
}

impl<T, S> OptionalFromRequestParts<S> for Query<T>
where
    T: DeserializeOwned,
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &S,
    ) -> Result<Option<Self>, Self::Rejection> {
        <Self as FromRequestParts<S>>::from_request_parts(parts, state)
            .await
            .map(Some)
    }
}
