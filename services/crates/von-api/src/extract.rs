use crate::error::ApiError;
use axum::extract::FromRequestParts;
use axum::http::HeaderMap;
use axum::http::request::Parts;
use serde::de::DeserializeOwned;
use von_error::Error;

/// Pulls the bearer token out of the authorization header, accepting any case
/// for the scheme the way the TypeScript service does.
pub fn bearer(headers: &HeaderMap) -> Result<&str, Error> {
    let value = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(Error::MissingCredentials)?;
    let (scheme, token) = value.split_once(' ').ok_or(Error::MissingCredentials)?;
    if !scheme.eq_ignore_ascii_case("bearer") || token.is_empty() {
        return Err(Error::MissingCredentials);
    }
    Ok(token)
}

/// Reads repeated query keys into a sequence the way Elysia does, which axum's own Query rejects.
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
