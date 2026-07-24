use super::connection::{TunnelRequest, TunnelResponse};
use crate::state::Shared;
use axum::{
    body::Bytes,
    extract::{Path, State},
    http::{HeaderMap, HeaderName, HeaderValue, Method, StatusCode, Uri},
    response::{IntoResponse, Response},
};
use std::collections::HashMap;
use std::time::Duration;
use tokio::sync::{mpsc, oneshot};

const FORWARD_TIMEOUT: Duration = Duration::from_secs(30);

/// Hop by hop headers describe the tunnel's own transfer, so passing them back
/// would describe a body the client is not receiving.
const STRIPPED: [&str; 2] = ["content-encoding", "transfer-encoding"];

fn max_body_bytes() -> usize {
    std::env::var("API_MAX_BODY_BYTES")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(1_048_576)
}

fn error(status: StatusCode, message: &str, retryable: bool) -> Response {
    (
        status,
        axum::Json(serde_json::json!({
            "error": { "message": message, "retryable": retryable }
        })),
    )
        .into_response()
}

/// The wildcard route supplies a second segment, so both shapes deserialize into
/// one struct rather than needing a handler each.
#[derive(serde::Deserialize)]
pub struct ProxyPath {
    tunnel_id: String,
    // Captured so the wildcard route deserializes, the path comes off the uri.
    #[serde(default)]
    _rest: Option<String>,
}

pub async fn handler(
    State(state): State<Shared>,
    Path(ProxyPath { tunnel_id, .. }): Path<ProxyPath>,
    method: Method,
    uri: Uri,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let limit = max_body_bytes();
    if body.len() > limit {
        return error(
            StatusCode::PAYLOAD_TOO_LARGE,
            &format!("Payload exceeds {limit} byte limit"),
            false,
        );
    }

    // Cloning the Arc releases the map shard lock before the awaits below.
    let connection = state.tunnels.get(&tunnel_id).map(|entry| entry.clone());
    let Some(connection) = connection else {
        // Real forwarding is gated on multi instance deploys, so a remote owner gets an honest 503.
        let mut conn = state.redis.clone();
        let owner: Option<String> = redis::cmd("GET")
            .arg(format!("tunnel:conn:{tunnel_id}"))
            .query_async(&mut conn)
            .await
            .unwrap_or(None);
        if owner.is_some_and(|instance| instance != state.instance_id) {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                "tunnel is connected to another instance",
            )
                .into_response();
        }
        return error(StatusCode::NOT_FOUND, "Tunnel not found", false);
    };

    let path = uri
        .path()
        .strip_prefix(&format!("/t/{tunnel_id}"))
        .filter(|rest| !rest.is_empty())
        .unwrap_or("/");
    let path = match uri.query() {
        Some(query) => format!("{path}?{query}"),
        None => path.to_owned(),
    };

    let forwarded: HashMap<String, String> = headers
        .iter()
        .filter(|(name, _)| name.as_str() != "host")
        .filter_map(|(name, value)| {
            Some((name.as_str().to_owned(), value.to_str().ok()?.to_owned()))
        })
        .collect();

    let request_id = uuid::Uuid::new_v4().to_string();
    let (tx, rx) = oneshot::channel();
    connection.pending.insert(request_id.clone(), tx);

    let payload = TunnelRequest {
        id: request_id.clone(),
        method: method.to_string(),
        path,
        headers: forwarded,
        body: (!body.is_empty()).then(|| String::from_utf8_lossy(&body).into_owned()),
    };

    let Ok(encoded) = serde_json::to_string(&payload) else {
        connection.pending.remove(&request_id);
        return error(StatusCode::BAD_GATEWAY, "Tunnel error", true);
    };
    match connection.outbound.try_send(encoded) {
        Ok(()) => {}
        Err(mpsc::error::TrySendError::Full(_)) => {
            connection.pending.remove(&request_id);
            return (StatusCode::SERVICE_UNAVAILABLE, "tunnel backlog full").into_response();
        }
        Err(mpsc::error::TrySendError::Closed(_)) => {
            connection.pending.remove(&request_id);
            return error(StatusCode::BAD_GATEWAY, "Tunnel not connected", true);
        }
    }

    match tokio::time::timeout(FORWARD_TIMEOUT, rx).await {
        Ok(Ok(response)) => build_response(response),
        Ok(Err(_)) => {
            connection.pending.remove(&request_id);
            error(StatusCode::BAD_GATEWAY, "Tunnel closed", true)
        }
        Err(_) => {
            connection.pending.remove(&request_id);
            error(StatusCode::BAD_GATEWAY, "Request timeout", true)
        }
    }
}

fn build_response(response: TunnelResponse) -> Response {
    let status = StatusCode::from_u16(response.status).unwrap_or(StatusCode::BAD_GATEWAY);
    let mut out = Response::builder().status(status);

    for (name, value) in &response.headers {
        if STRIPPED.contains(&name.to_lowercase().as_str()) {
            continue;
        }
        if let (Ok(name), Ok(value)) = (
            HeaderName::from_bytes(name.as_bytes()),
            HeaderValue::from_str(value),
        ) {
            out = out.header(name, value);
        }
    }

    out.body(response.body.into())
        .unwrap_or_else(|_| error(StatusCode::BAD_GATEWAY, "Tunnel error", true))
}
