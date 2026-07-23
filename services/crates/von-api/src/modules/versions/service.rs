use super::model::{CreateVersion, UpdateVersion, VersionList, WebhookVersion, clean_transforms};
use crate::pagination::{PaginationQuery, fetch_org_page};
use crate::state::ApiState;
use crate::to_iso;
use chrono::Utc;
use sqlx::Row;
use sqlx::postgres::PgRow;
use von_error::Result;

const RESOURCE: &str = "webhook-versions";

const SELECT_COLUMNS: &str = "id::text AS id, version, transforms, created_at, updated_at";

fn to_version(row: &PgRow) -> Result<WebhookVersion> {
    let stored = row.try_get("transforms")?;
    Ok(WebhookVersion {
        id: row.try_get("id")?,
        version: row.try_get("version")?,
        transforms: clean_transforms(&stored).unwrap_or(stored),
        created_at: to_iso(row.try_get("created_at")?),
        updated_at: to_iso(row.try_get("updated_at")?),
    })
}

/// The delivery worker caches transforms under this key for 60 seconds, so a
/// mutation that skipped the delete would keep transforming live payloads with
/// the previous rules.
async fn invalidate_version_cache(
    state: &ApiState,
    organization_id: &str,
    version: &str,
) -> Result<()> {
    let mut conn = state.redis.clone();
    redis::cmd("DEL")
        .arg(format!("version:{organization_id}:{version}"))
        .query_async::<()>(&mut conn)
        .await?;
    Ok(())
}

async fn find_row(state: &ApiState, organization_id: &str, version: &str) -> Result<Option<PgRow>> {
    let row = sqlx::query(&format!(
        "SELECT {SELECT_COLUMNS} FROM webhook_version \
         WHERE version = $1 AND organization_id = $2::uuid LIMIT 1"
    ))
    .bind(version)
    .bind(organization_id)
    .fetch_optional(&state.pool)
    .await?;
    Ok(row)
}

pub async fn create(
    state: &ApiState,
    organization_id: &str,
    params: CreateVersion,
) -> Result<WebhookVersion> {
    let transforms = params.validate()?;

    let now = Utc::now().naive_utc();
    let row = sqlx::query(&format!(
        "INSERT INTO webhook_version (id, organization_id, version, transforms, created_at, updated_at) \
         VALUES ($1, $2::uuid, $3, $4, $5, $5) RETURNING {SELECT_COLUMNS}"
    ))
    .bind(uuid::Uuid::new_v4())
    .bind(organization_id)
    .bind(&params.version)
    .bind(&transforms)
    .bind(now)
    .fetch_one(&state.pool)
    .await?;

    to_version(&row)
}

pub async fn get_all(
    state: &ApiState,
    organization_id: &str,
    pagination: &PaginationQuery,
) -> Result<VersionList> {
    let (rows, next_cursor) = fetch_org_page(
        &state.pool,
        "webhook_version",
        SELECT_COLUMNS,
        RESOURCE,
        organization_id,
        pagination,
    )
    .await?;

    Ok(VersionList {
        versions: rows.iter().map(to_version).collect::<Result<Vec<_>>>()?,
        next_cursor,
    })
}

pub async fn get_by_version(
    state: &ApiState,
    organization_id: &str,
    version: &str,
) -> Result<Option<WebhookVersion>> {
    match find_row(state, organization_id, version).await? {
        Some(row) => Ok(Some(to_version(&row)?)),
        None => Ok(None),
    }
}

pub async fn update(
    state: &ApiState,
    organization_id: &str,
    version: &str,
    params: UpdateVersion,
) -> Result<Option<WebhookVersion>> {
    let transforms = params.validate()?;

    // The UPDATE already filters by version and org, so a missing row is the 404.
    let Some(row) = sqlx::query(&format!(
        "UPDATE webhook_version SET transforms = $1, updated_at = $2 \
         WHERE version = $3 AND organization_id = $4::uuid RETURNING {SELECT_COLUMNS}"
    ))
    .bind(&transforms)
    .bind(Utc::now().naive_utc())
    .bind(version)
    .bind(organization_id)
    .fetch_optional(&state.pool)
    .await?
    else {
        return Ok(None);
    };

    invalidate_version_cache(state, organization_id, version).await?;
    Ok(Some(to_version(&row)?))
}

pub async fn delete(state: &ApiState, organization_id: &str, version: &str) -> Result<bool> {
    let deleted = sqlx::query(
        "DELETE FROM webhook_version WHERE version = $1 AND organization_id = $2::uuid",
    )
    .bind(version)
    .bind(organization_id)
    .execute(&state.pool)
    .await?
    .rows_affected();

    if deleted > 0 {
        invalidate_version_cache(state, organization_id, version).await?;
    }
    Ok(deleted > 0)
}
