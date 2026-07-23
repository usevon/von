use super::registry::{Connection, TunnelResponse};
use crate::state::Shared;
use axum::{
    extract::{
        Path, State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    http::{HeaderMap, StatusCode},
    response::Response,
};
use dashmap::DashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::sync::{mpsc, watch};

const CONN_KEY_TTL: i64 = 60;
const REVALIDATE_INTERVAL: Duration = Duration::from_secs(30);
const PING_INTERVAL: Duration = Duration::from_secs(30);
const IDLE_TIMEOUT: Duration = Duration::from_secs(90);
const OUTBOUND_BUFFER: usize = 256;

pub async fn handler(
    State(state): State<Shared>,
    Path(tunnel_id): Path<String>,
    headers: HeaderMap,
    upgrade: WebSocketUpgrade,
) -> Result<Response, StatusCode> {
    let token = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(StatusCode::UNAUTHORIZED)?
        .to_owned();

    let principal = state
        .auth
        .resolve_principal(&token)
        .await
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    // Checked before the upgrade so a rejected client gets a status, not a socket
    // that closes on open.
    let owned = sqlx::query(
        "SELECT 1 FROM tunnel WHERE id = $1 AND organization_id = $2::uuid AND user_id = $3::uuid",
    )
    .bind(&tunnel_id)
    .bind(&principal.organization_id)
    .bind(&principal.user_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .is_some();

    if !owned {
        return Err(StatusCode::NOT_FOUND);
    }

    Ok(upgrade.on_upgrade(move |socket| {
        serve(
            socket,
            state,
            tunnel_id,
            principal.organization_id,
            principal.user_id,
            token,
        )
    }))
}

async fn serve(
    socket: WebSocket,
    state: Shared,
    tunnel_id: String,
    organization_id: String,
    user_id: String,
    token: String,
) {
    use futures_util::{SinkExt, StreamExt};

    let (mut sink, mut stream) = socket.split();
    let (outbound, mut outbox) = mpsc::channel::<String>(OUTBOUND_BUFFER);
    let (shutdown, _) = watch::channel(false);

    let connection = Arc::new(Connection {
        outbound,
        pending: DashMap::new(),
        organization_id: organization_id.clone(),
        user_id,
        shutdown,
    });

    if let Some(previous) = state.tunnels.insert(tunnel_id.clone(), connection.clone()) {
        let _ = previous
            .outbound
            .try_send(r#"{"type":"takeover"}"#.to_owned());
        previous.fail_pending();
        // Without the signal the superseded tasks linger until the old client notices.
        previous.shutdown.send_replace(true);
    }

    register_in_redis(&state, &tunnel_id, &organization_id).await;

    let last_seen = Arc::new(Mutex::new(Instant::now()));

    let writer = tokio::spawn({
        let connection = connection.clone();
        let last_seen = last_seen.clone();
        async move {
            let mut shutdown = connection.shutdown.subscribe();
            let mut ping = tokio::time::interval(PING_INTERVAL);
            ping.tick().await;
            // The signal may have fired before this task subscribed.
            while !*shutdown.borrow_and_update() {
                tokio::select! {
                    queued = outbox.recv() => match queued {
                        Some(text) => {
                            if sink.send(Message::Text(text.into())).await.is_err() {
                                break;
                            }
                        }
                        None => break,
                    },
                    _ = ping.tick() => {
                        // A peer silent past the idle window is a half open socket, not a slow one.
                        if last_seen.lock().unwrap().elapsed() > IDLE_TIMEOUT {
                            connection.shutdown.send_replace(true);
                            break;
                        }
                        if sink.send(Message::Ping(Vec::new().into())).await.is_err() {
                            break;
                        }
                    },
                    _ = shutdown.changed() => break,
                }
            }
            let _ = sink.close().await;
        }
    });

    let keepalive = tokio::spawn({
        let state = state.clone();
        let tunnel_id = tunnel_id.clone();
        let connection = connection.clone();
        async move {
            let mut ticker = tokio::time::interval(REVALIDATE_INTERVAL);
            ticker.tick().await;
            loop {
                ticker.tick().await;
                // A socket opened with a valid session would otherwise outlive it.
                match state.auth.resolve_principal(&token).await {
                    Ok(current) if current.organization_id == connection.organization_id => {
                        refresh_ttl(&state, &tunnel_id).await;
                    }
                    _ => {
                        let _ = connection
                            .outbound
                            .try_send(r#"{"type":"session_expired"}"#.to_owned());
                        // An expired session must not keep proxying while waiting on the client.
                        connection.shutdown.send_replace(true);
                        break;
                    }
                }
            }
        }
    });

    let mut shutdown = connection.shutdown.subscribe();
    // The signal may have fired before this loop subscribed.
    while !*shutdown.borrow_and_update() {
        let message = tokio::select! {
            inbound = stream.next() => match inbound {
                Some(Ok(message)) => message,
                _ => break,
            },
            _ = shutdown.changed() => break,
        };

        *last_seen.lock().unwrap() = Instant::now();

        let text = match message {
            Message::Text(text) => text.to_string(),
            Message::Binary(bytes) => match String::from_utf8(bytes.to_vec()) {
                Ok(text) => text,
                Err(_) => continue,
            },
            Message::Close(_) => break,
            _ => continue,
        };

        let Ok(response) = serde_json::from_str::<TunnelResponse>(&text) else {
            continue;
        };
        if let Some((_, waiter)) = connection.pending.remove(&response.request_id) {
            let _ = waiter.send(response);
        }
    }

    keepalive.abort();
    connection.shutdown.send_replace(true);
    writer.abort();
    connection.fail_pending();
    // A superseded connection no longer owns the registry entry or the redis key.
    if state.tunnels.remove_if_same(&tunnel_id, &connection) {
        unregister_in_redis(&state, &tunnel_id, &organization_id).await;
    }
}

async fn register_in_redis(state: &Shared, tunnel_id: &str, organization_id: &str) {
    let mut conn = state.redis.clone();
    let _: redis::RedisResult<()> = redis::pipe()
        .cmd("SET")
        .arg(format!("tunnel:conn:{tunnel_id}"))
        .arg(&state.instance_id)
        .arg("EX")
        .arg(CONN_KEY_TTL)
        .ignore()
        .cmd("SADD")
        .arg(format!("tunnel:org:{organization_id}"))
        .arg(tunnel_id)
        .ignore()
        .query_async(&mut conn)
        .await;
}

async fn refresh_ttl(state: &Shared, tunnel_id: &str) {
    let mut conn = state.redis.clone();
    let _: redis::RedisResult<()> = redis::cmd("EXPIRE")
        .arg(format!("tunnel:conn:{tunnel_id}"))
        .arg(CONN_KEY_TTL)
        .query_async(&mut conn)
        .await;
}

async fn unregister_in_redis(state: &Shared, tunnel_id: &str, organization_id: &str) {
    let mut conn = state.redis.clone();
    let _: redis::RedisResult<()> = redis::pipe()
        .cmd("DEL")
        .arg(format!("tunnel:conn:{tunnel_id}"))
        .ignore()
        .cmd("SREM")
        .arg(format!("tunnel:org:{organization_id}"))
        .arg(tunnel_id)
        .ignore()
        .query_async(&mut conn)
        .await;
}
