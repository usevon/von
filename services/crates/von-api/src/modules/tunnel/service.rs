use super::model::{RegisterResponse, RotateResponse};
use crate::cipher::{decrypt_secret, encrypt_secret};
use crate::state::ApiState;
use sha2::{Digest, Sha256};
use sqlx::Row;
use von_error::{Error, Result};

const DEFAULT_MAX_TUNNELS: i64 = 3;
const TUNNEL_ID_LENGTH: usize = 12;

fn max_tunnels_per_org() -> i64 {
    std::env::var("MAX_TUNNELS_PER_ORG")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(DEFAULT_MAX_TUNNELS)
}

/// The id is derived rather than random so reconnecting on the same port returns
/// the same tunnel instead of leaking a new row each run.
fn tunnel_id(organization_id: &str, user_id: &str, port: i32) -> String {
    let mut hasher = Sha256::new();
    hasher.update(format!("{organization_id}:{user_id}:{port}").as_bytes());
    let mut hex = hex::encode(hasher.finalize());
    hex.truncate(TUNNEL_ID_LENGTH);
    hex
}

fn generate_tunnel_secret() -> String {
    let mut bytes = [0u8; 16];
    rand::Rng::fill(&mut rand::thread_rng(), &mut bytes[..]);
    hex::encode(bytes)
}

pub async fn register(
    state: &ApiState,
    organization_id: &str,
    user_id: &str,
    port: i32,
) -> Result<RegisterResponse> {
    let id = tunnel_id(organization_id, user_id, port);

    let existing = sqlx::query("SELECT secret FROM tunnel WHERE id = $1 LIMIT 1")
        .bind(&id)
        .fetch_optional(&state.pool)
        .await?;

    if let Some(row) = existing {
        return Ok(RegisterResponse {
            secret: decrypt_secret(row.try_get("secret")?)?,
            tunnel_id: id,
        });
    }

    let count: i64 =
        sqlx::query("SELECT count(*) AS n FROM tunnel WHERE organization_id = $1::uuid")
            .bind(organization_id)
            .fetch_one(&state.pool)
            .await?
            .try_get("n")?;

    let limit = max_tunnels_per_org();
    if count >= limit {
        return Err(Error::BadRequest(format!(
            "Maximum {limit} tunnels per organization"
        )));
    }

    let secret = generate_tunnel_secret();
    sqlx::query(
        "INSERT INTO tunnel (id, secret, organization_id, user_id, port) \
         VALUES ($1, $2, $3::uuid, $4::uuid, $5)",
    )
    .bind(&id)
    .bind(encrypt_secret(&secret)?)
    .bind(organization_id)
    .bind(user_id)
    .bind(port)
    .execute(&state.pool)
    .await?;

    Ok(RegisterResponse {
        tunnel_id: id,
        secret,
    })
}

pub async fn rotate(
    state: &ApiState,
    organization_id: &str,
    user_id: &str,
    id: &str,
) -> Result<Option<RotateResponse>> {
    let existing = sqlx::query(
        "SELECT organization_id::text AS org_id, user_id::text AS user_id \
         FROM tunnel WHERE id = $1 LIMIT 1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?;

    // Ownership is checked on both columns because a tunnel belongs to one user
    // inside the organization, not to the organization at large.
    let owned = existing.as_ref().is_some_and(|row| {
        row.try_get::<String, _>("org_id").ok().as_deref() == Some(organization_id)
            && row.try_get::<String, _>("user_id").ok().as_deref() == Some(user_id)
    });
    if !owned {
        return Ok(None);
    }

    let secret = generate_tunnel_secret();
    sqlx::query("UPDATE tunnel SET secret = $1 WHERE id = $2")
        .bind(encrypt_secret(&secret)?)
        .bind(id)
        .execute(&state.pool)
        .await?;

    notify_rotated(state, id, &secret).await;
    Ok(Some(RotateResponse { secret }))
}

/// The connected client holds the previous secret, so it is told to swap over
/// the same way the typescript service pushes the message down the socket.
async fn notify_rotated(state: &ApiState, id: &str, secret: &str) {
    let mut conn = state.redis.clone();
    let payload = serde_json::json!({ "type": "secret_rotated", "secret": secret }).to_string();
    let _: redis::RedisResult<()> = redis::cmd("PUBLISH")
        .arg(format!("tunnel:control:{id}"))
        .arg(payload)
        .query_async(&mut conn)
        .await;
}

/// Active tunnels come from the shared redis set rather than a local map so the
/// answer does not depend on which instance the request landed on.
pub async fn active_tunnels(state: &ApiState, organization_id: &str) -> Result<Vec<String>> {
    let mut conn = state.redis.clone();
    let members: Vec<String> = redis::cmd("SMEMBERS")
        .arg(format!("tunnel:org:{organization_id}"))
        .query_async(&mut conn)
        .await?;

    if members.is_empty() {
        return Ok(members);
    }

    // A member whose connection key expired is stale, so it is filtered out and
    // dropped rather than reported as active.
    let mut pipe = redis::pipe();
    for id in &members {
        pipe.cmd("EXISTS").arg(format!("tunnel:conn:{id}"));
    }
    let present: Vec<bool> = pipe.query_async(&mut conn).await?;

    let mut active = Vec::new();
    let mut stale = Vec::new();
    for (id, alive) in members.into_iter().zip(present) {
        if alive {
            active.push(id)
        } else {
            stale.push(id)
        }
    }

    if !stale.is_empty() {
        let _: redis::RedisResult<()> = redis::cmd("SREM")
            .arg(format!("tunnel:org:{organization_id}"))
            .arg(&stale)
            .query_async(&mut conn)
            .await;
    }

    Ok(active)
}
