use super::model::{
    CreateEndpoint, Endpoint, EndpointList, EndpointWithSecret, RotateResponse, TestResponse,
    UpdateEndpoint,
};
use crate::auth::Tenant;
use crate::cipher::{decrypt_secret, encrypt_secret, generate_secret};
use crate::pagination::{PaginationQuery, fetch_org_page};
use crate::state::ApiState;
use crate::url_safety::assert_safe_webhook_url;
use crate::{DEFAULT_MAX_ATTEMPTS, DEFAULT_TIMEOUT_MS, to_iso};
use chrono::{NaiveDateTime, Utc};
use serde_json::value::RawValue;
use sqlx::Row;
use sqlx::postgres::PgRow;
use von_error::{Error, Result};
use von_types::{BufferedDelivery, BufferedEntry, BufferedEvent, QUOTA_TTL, STREAM_KEY, quota_key};

const RESOURCE: &str = "endpoints";

// Signing secrets stay out of this list so ordinary reads never pull ciphertext,
// rotate_secret selects the secret itself.
const SELECT_COLUMNS: &str = "id::text AS id, url, description, status, \
     version, max_attempts, timeout_ms, events, last_success_at, created_at, updated_at";

fn to_endpoint(row: &PgRow) -> Result<Endpoint> {
    Ok(Endpoint {
        id: row.try_get("id")?,
        url: row.try_get("url")?,
        description: row.try_get("description")?,
        status: row.try_get("status")?,
        version: row.try_get("version")?,
        max_attempts: row.try_get("max_attempts")?,
        timeout_ms: row.try_get("timeout_ms")?,
        events: row.try_get("events")?,
        last_success_at: row
            .try_get::<Option<NaiveDateTime>, _>("last_success_at")?
            .map(to_iso),
        created_at: to_iso(row.try_get("created_at")?),
        updated_at: to_iso(row.try_get("updated_at")?),
    })
}

/// The TypeScript service deletes this key after every mutation, and its delivery
/// path reads it, so a stale key there would route to the pre-mutation endpoints.
async fn invalidate_endpoints_cache(state: &ApiState, organization_id: &str) -> Result<()> {
    state.auth.invalidate_organization(organization_id);
    let mut conn = state.redis.clone();
    redis::cmd("DEL")
        .arg(format!("endpoints:{organization_id}"))
        .query_async::<()>(&mut conn)
        .await?;
    Ok(())
}

async fn find_row(state: &ApiState, organization_id: &str, id: &str) -> Result<Option<PgRow>> {
    let Ok(uuid) = uuid::Uuid::parse_str(id) else {
        return Ok(None);
    };
    let row = sqlx::query(&format!(
        "SELECT {SELECT_COLUMNS} FROM endpoint WHERE id = $1 AND organization_id = $2::uuid LIMIT 1"
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
    params: CreateEndpoint,
) -> Result<EndpointWithSecret> {
    params.validate()?;
    assert_safe_webhook_url(&params.url).await?;

    let secret = generate_secret();
    let status = params.status.unwrap_or_else(|| "active".to_owned());
    let now = Utc::now().naive_utc();

    let row = sqlx::query(&format!(
        "INSERT INTO endpoint (id, organization_id, url, description, secret, status, version, \
         max_attempts, timeout_ms, events, created_at, updated_at) \
         VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11) \
         RETURNING {SELECT_COLUMNS}"
    ))
    .bind(uuid::Uuid::new_v4())
    .bind(organization_id)
    .bind(&params.url)
    .bind(&params.description)
    .bind(encrypt_secret(&secret)?)
    .bind(&status)
    .bind(&params.version)
    .bind(params.max_attempts.unwrap_or(DEFAULT_MAX_ATTEMPTS))
    .bind(params.timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS))
    .bind(&params.events)
    .bind(now)
    .fetch_one(&state.pool)
    .await?;

    if status != "disabled" {
        invalidate_endpoints_cache(state, organization_id).await?;
    }

    Ok(EndpointWithSecret {
        endpoint: to_endpoint(&row)?,
        secret,
    })
}

pub async fn get_all(
    state: &ApiState,
    organization_id: &str,
    pagination: &PaginationQuery,
) -> Result<EndpointList> {
    let (rows, next_cursor) = fetch_org_page(
        &state.pool,
        "endpoint",
        SELECT_COLUMNS,
        RESOURCE,
        organization_id,
        pagination,
    )
    .await?;

    Ok(EndpointList {
        endpoints: rows.iter().map(to_endpoint).collect::<Result<Vec<_>>>()?,
        next_cursor,
    })
}

pub async fn get_by_id(
    state: &ApiState,
    organization_id: &str,
    id: &str,
) -> Result<Option<Endpoint>> {
    match find_row(state, organization_id, id).await? {
        Some(row) => Ok(Some(to_endpoint(&row)?)),
        None => Ok(None),
    }
}

pub async fn update(
    state: &ApiState,
    organization_id: &str,
    id: &str,
    params: UpdateEndpoint,
) -> Result<Option<Endpoint>> {
    params.validate()?;
    if let Some(url) = &params.url {
        assert_safe_webhook_url(url).await?;
    }

    let Some(existing) = find_row(state, organization_id, id).await? else {
        return Ok(None);
    };

    let previous_status: String = existing.try_get("status")?;
    let url = params.url.unwrap_or(existing.try_get("url")?);
    let description = params
        .description
        .or(existing.try_get::<Option<String>, _>("description")?);
    let status = params.status.clone().unwrap_or(existing.try_get("status")?);
    let version = match params.version {
        Some(value) => value,
        None => existing.try_get("version")?,
    };
    let events = match params.events {
        Some(value) => value,
        None => existing.try_get("events")?,
    };
    let max_attempts = params
        .max_attempts
        .unwrap_or(existing.try_get("max_attempts")?);
    let timeout_ms = params.timeout_ms.unwrap_or(existing.try_get("timeout_ms")?);

    let row = sqlx::query(&format!(
        "UPDATE endpoint SET url = $1, description = $2, status = $3, version = $4, \
         max_attempts = $5, timeout_ms = $6, events = $7, updated_at = $8 \
         WHERE id = $9 RETURNING {SELECT_COLUMNS}"
    ))
    .bind(&url)
    .bind(&description)
    .bind(&status)
    .bind(&version)
    .bind(max_attempts)
    .bind(timeout_ms)
    .bind(&events)
    .bind(Utc::now().naive_utc())
    .bind(
        existing
            .try_get::<String, _>("id")?
            .parse::<uuid::Uuid>()
            .ok(),
    )
    .fetch_one(&state.pool)
    .await?;

    if previous_status == "active" || params.status.is_some() {
        invalidate_endpoints_cache(state, organization_id).await?;
    }

    Ok(Some(to_endpoint(&row)?))
}

pub async fn delete(state: &ApiState, organization_id: &str, id: &str) -> Result<bool> {
    let Ok(uuid) = uuid::Uuid::parse_str(id) else {
        return Ok(false);
    };
    let deleted = sqlx::query("DELETE FROM endpoint WHERE id = $1 AND organization_id = $2::uuid")
        .bind(uuid)
        .bind(organization_id)
        .execute(&state.pool)
        .await?
        .rows_affected();

    if deleted > 0 {
        invalidate_endpoints_cache(state, organization_id).await?;
    }
    Ok(deleted > 0)
}

pub async fn rotate_secret(
    state: &ApiState,
    organization_id: &str,
    id: &str,
) -> Result<RotateResponse> {
    let uuid = uuid::Uuid::parse_str(id).map_err(|_| Error::NotFound("Endpoint".to_owned()))?;
    let encrypted: Option<String> = sqlx::query_scalar(
        "SELECT secret FROM endpoint WHERE id = $1 AND organization_id = $2::uuid LIMIT 1",
    )
    .bind(uuid)
    .bind(organization_id)
    .fetch_optional(&state.pool)
    .await?;
    let encrypted = encrypted.ok_or_else(|| Error::NotFound("Endpoint".to_owned()))?;

    let new_secret = generate_secret();
    let previous_secret = decrypt_secret(&encrypted)?;

    sqlx::query(
        "UPDATE endpoint SET secret = $1, previous_secret = $2, updated_at = $3 WHERE id = $4",
    )
    .bind(encrypt_secret(&new_secret)?)
    .bind(encrypt_secret(&previous_secret)?)
    .bind(Utc::now().naive_utc())
    .bind(uuid)
    .execute(&state.pool)
    .await?;

    invalidate_endpoints_cache(state, organization_id).await?;

    Ok(RotateResponse {
        secret: new_secret,
        previous_secret,
    })
}

pub async fn clear_previous_secret(
    state: &ApiState,
    organization_id: &str,
    id: &str,
) -> Result<bool> {
    let uuid = uuid::Uuid::parse_str(id).map_err(|_| Error::NotFound("Endpoint".to_owned()))?;

    let updated = sqlx::query(
        "UPDATE endpoint SET previous_secret = NULL, updated_at = $1 \
         WHERE id = $2 AND organization_id = $3::uuid",
    )
    .bind(Utc::now().naive_utc())
    .bind(uuid)
    .bind(organization_id)
    .execute(&state.pool)
    .await?
    .rows_affected();

    if updated == 0 {
        return Err(Error::NotFound("Endpoint".to_owned()));
    }

    invalidate_endpoints_cache(state, organization_id).await?;
    Ok(true)
}

const RESERVE_AND_BUFFER_ONE: &str = r#"
local quota_key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local has_overage = tonumber(ARGV[3])
local stream_key = ARGV[4]
local payload = ARGV[5]

local current = tonumber(redis.call('GET', quota_key) or '0')
if has_overage == 0 and current + 1 > limit then
  return {0, current}
end

local new_val = redis.call('INCRBY', quota_key, 1)
redis.call('EXPIRE', quota_key, ttl)
redis.call('XADD', stream_key, 'MAXLEN', '~', '100000', '*', 'data', payload)

return {1, new_val}
"#;

/// The test event rides the same buffer the ingest path uses, so the flusher
/// writes its event and delivery rows and dispatches it like any other webhook.
pub async fn test_endpoint(
    state: &ApiState,
    tenant: &Tenant,
    id: &str,
    payload: Option<Box<RawValue>>,
    event_type: Option<String>,
) -> Result<TestResponse> {
    let organization_id = &tenant.organization_id;
    if find_row(state, organization_id, id).await?.is_none() {
        return Err(Error::NotFound("Endpoint".to_owned()));
    }

    let now = Utc::now();
    let now_iso = now.to_rfc3339();
    let event_type = event_type.unwrap_or_else(|| "von.test".to_owned());

    let payload = match payload {
        Some(value) => value,
        None => RawValue::from_string(
            serde_json::json!({ "test": true, "timestamp": now_iso }).to_string(),
        )?,
    };

    let event_id = uuid::Uuid::new_v4().to_string();
    let delivery_id = uuid::Uuid::new_v4().to_string();

    let entry = BufferedEntry {
        events: vec![BufferedEvent {
            id: event_id.clone(),
            organization_id: organization_id.clone(),
            event_type,
            payload,
            idempotency_key: None,
            created_at: now_iso.clone(),
        }],
        deliveries: vec![BufferedDelivery {
            id: delivery_id.clone(),
            organization_id: organization_id.clone(),
            event_id: event_id.clone(),
            endpoint_id: id.to_owned(),
            status: "pending".to_owned(),
            attempts: 0,
            created_at: now_iso,
        }],
    };

    let mut conn = state.redis.clone();
    let (allowed, usage): (i64, i64) = redis::cmd("EVAL")
        .arg(RESERVE_AND_BUFFER_ONE)
        .arg(1)
        .arg(quota_key(organization_id, &now.format("%Y-%m").to_string()))
        .arg(tenant.monthly_limit)
        .arg(QUOTA_TTL)
        .arg(i64::from(tenant.has_overage))
        .arg(STREAM_KEY)
        .arg(serde_json::to_string(&entry)?)
        .query_async(&mut conn)
        .await?;

    if allowed != 1 {
        return Err(Error::QuotaExceeded {
            used: usage,
            limit: tenant.monthly_limit,
        });
    }

    Ok(TestResponse {
        event_id,
        delivery_id,
    })
}
