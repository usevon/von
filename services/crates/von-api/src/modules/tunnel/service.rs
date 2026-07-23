use super::model::{RegisterResponse, RotateResponse};
use crate::cipher::{decrypt_secret, encrypt_secret};
use crate::state::ApiState;
use sqlx::Row;
use von_error::{Error, Result};

const DEFAULT_MAX_TUNNELS: i64 = 3;

fn max_tunnels_per_org() -> i64 {
    std::env::var("MAX_TUNNELS_PER_ORG")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(DEFAULT_MAX_TUNNELS)
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
    // Reusing the active row keeps reconnects on the same port stable while the
    // id itself stays random and unguessable on the public proxy path.
    let existing = sqlx::query(
        "SELECT id, secret FROM tunnel \
         WHERE organization_id = $1::uuid AND user_id = $2::uuid AND port = $3 \
           AND status = 'active' \
         LIMIT 1",
    )
    .bind(organization_id)
    .bind(user_id)
    .bind(port)
    .fetch_optional(&state.pool)
    .await?;

    if let Some(row) = existing {
        return Ok(RegisterResponse {
            secret: decrypt_secret(row.try_get("secret")?)?,
            tunnel_id: row.try_get("id")?,
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

    let id = uuid::Uuid::new_v4().simple().to_string();
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
/// while the socket is still live.
async fn notify_rotated(state: &ApiState, id: &str, secret: &str) {
    let payload = serde_json::json!({ "type": "secret_rotated", "secret": secret }).to_string();
    if let Some(connection) = state.tunnels.get(id) {
        let _ = connection.outbound.try_send(payload);
        return;
    }
    // Cross instance delivery of this publish arrives with cross instance routing.
    let mut conn = state.redis.clone();
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
