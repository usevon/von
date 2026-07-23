use super::model::{
    CreateInboundEndpoint, InboundEndpoint, InboundEndpointList, UpdateInboundEndpoint,
};
use crate::cipher::{decrypt_secret, encrypt_secret, generate_secret};
use crate::pagination::{PaginationQuery, fetch_org_page};
use crate::state::ApiState;
use crate::url_safety::assert_safe_webhook_url;
use crate::{DEFAULT_MAX_ATTEMPTS, DEFAULT_TIMEOUT_MS, to_iso};
use chrono::{NaiveDateTime, Utc};
use sqlx::Row;
use sqlx::postgres::PgRow;
use von_error::Result;

const RESOURCE: &str = "inbound-endpoints";

const SELECT_COLUMNS: &str = "id::text AS id, name, provider, secret, forward_url, status, \
     max_attempts, timeout_ms, last_success_at, created_at, updated_at";

const FORWARD_URL_ERROR: &str =
    "Invalid forward URL: must be http(s) and not target private networks";

fn to_endpoint(row: &PgRow) -> Result<InboundEndpoint> {
    Ok(InboundEndpoint {
        id: row.try_get("id")?,
        name: row.try_get("name")?,
        provider: row.try_get("provider")?,
        secret: decrypt_secret(row.try_get("secret")?)?,
        forward_url: row.try_get("forward_url")?,
        status: row.try_get("status")?,
        max_attempts: row.try_get("max_attempts")?,
        timeout_ms: row.try_get("timeout_ms")?,
        last_success_at: row
            .try_get::<Option<NaiveDateTime>, _>("last_success_at")?
            .map(to_iso),
        created_at: to_iso(row.try_get("created_at")?),
        updated_at: to_iso(row.try_get("updated_at")?),
    })
}

/// The forwarding worker reads this key, so a mutation that left it in place
/// would keep forwarding to the previous target.
async fn invalidate_cache(state: &ApiState, endpoint_id: &str) -> Result<()> {
    let mut conn = state.redis.clone();
    redis::cmd("DEL")
        .arg(format!("inbound:{endpoint_id}"))
        .query_async::<()>(&mut conn)
        .await?;
    Ok(())
}

async fn find_row(state: &ApiState, organization_id: &str, id: &str) -> Result<Option<PgRow>> {
    let Ok(uuid) = uuid::Uuid::parse_str(id) else {
        return Ok(None);
    };
    let row = sqlx::query(&format!(
        "SELECT {SELECT_COLUMNS} FROM inbound_endpoint \
         WHERE id = $1 AND organization_id = $2::uuid LIMIT 1"
    ))
    .bind(uuid)
    .bind(organization_id)
    .fetch_optional(&state.pool)
    .await?;
    Ok(row)
}

pub async fn create(
    state: &ApiState,
    organization_id: &str,
    params: CreateInboundEndpoint,
) -> Result<InboundEndpoint> {
    params.validate()?;
    assert_safe_webhook_url_with(&params.forward_url).await?;

    let now = Utc::now().naive_utc();
    let row = sqlx::query(&format!(
        "INSERT INTO inbound_endpoint (id, organization_id, name, provider, secret, forward_url, \
         max_attempts, timeout_ms, status, created_at, updated_at) \
         VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $10) \
         RETURNING {SELECT_COLUMNS}"
    ))
    .bind(uuid::Uuid::new_v4())
    .bind(organization_id)
    .bind(&params.name)
    .bind(&params.provider)
    .bind(encrypt_secret(&generate_secret())?)
    .bind(&params.forward_url)
    .bind(params.max_attempts.unwrap_or(DEFAULT_MAX_ATTEMPTS))
    .bind(params.timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS))
    .bind(params.status.as_deref().unwrap_or("active"))
    .bind(now)
    .fetch_one(&state.pool)
    .await?;

    to_endpoint(&row)
}

async fn assert_safe_webhook_url_with(url: &str) -> Result<()> {
    assert_safe_webhook_url(url)
        .await
        .map_err(|_| von_error::Error::BadRequest(FORWARD_URL_ERROR.to_owned()))
}

pub async fn get_all(
    state: &ApiState,
    organization_id: &str,
    pagination: &PaginationQuery,
) -> Result<InboundEndpointList> {
    let (rows, next_cursor) = fetch_org_page(
        &state.pool,
        "inbound_endpoint",
        SELECT_COLUMNS,
        RESOURCE,
        organization_id,
        pagination,
    )
    .await?;

    Ok(InboundEndpointList {
        endpoints: rows.iter().map(to_endpoint).collect::<Result<Vec<_>>>()?,
        next_cursor,
    })
}

pub async fn get_by_id(
    state: &ApiState,
    organization_id: &str,
    id: &str,
) -> Result<Option<InboundEndpoint>> {
    match find_row(state, organization_id, id).await? {
        Some(row) => Ok(Some(to_endpoint(&row)?)),
        None => Ok(None),
    }
}

/// Every field falls back to the stored row so a partial body cannot blank out
/// the columns it omitted.
pub async fn update(
    state: &ApiState,
    organization_id: &str,
    id: &str,
    params: UpdateInboundEndpoint,
) -> Result<Option<InboundEndpoint>> {
    params.validate()?;
    if let Some(url) = &params.forward_url {
        assert_safe_webhook_url_with(url).await?;
    }

    if find_row(state, organization_id, id).await?.is_none() {
        return Ok(None);
    }

    let row = sqlx::query(&format!(
        "UPDATE inbound_endpoint SET \
         name = COALESCE($1, name), \
         provider = COALESCE($2, provider), \
         forward_url = COALESCE($3, forward_url), \
         max_attempts = COALESCE($4, max_attempts), \
         timeout_ms = COALESCE($5, timeout_ms), \
         status = COALESCE($6, status), \
         updated_at = $7 \
         WHERE id = $8::uuid AND organization_id = $9::uuid RETURNING {SELECT_COLUMNS}"
    ))
    .bind(&params.name)
    .bind(&params.provider)
    .bind(&params.forward_url)
    .bind(params.max_attempts)
    .bind(params.timeout_ms)
    .bind(&params.status)
    .bind(Utc::now().naive_utc())
    .bind(id)
    .bind(organization_id)
    .fetch_one(&state.pool)
    .await?;

    invalidate_cache(state, id).await?;
    Ok(Some(to_endpoint(&row)?))
}

pub async fn delete(state: &ApiState, organization_id: &str, id: &str) -> Result<bool> {
    let Ok(uuid) = uuid::Uuid::parse_str(id) else {
        return Ok(false);
    };
    let deleted =
        sqlx::query("DELETE FROM inbound_endpoint WHERE id = $1 AND organization_id = $2::uuid")
            .bind(uuid)
            .bind(organization_id)
            .execute(&state.pool)
            .await?
            .rows_affected();

    if deleted > 0 {
        invalidate_cache(state, id).await?;
    }
    Ok(deleted > 0)
}
