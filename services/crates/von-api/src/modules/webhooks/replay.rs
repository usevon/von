use crate::auth::Tenant;
use crate::queue::reserve_quota;
use crate::state::ApiState;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use utoipa::ToSchema;
use von_error::{Error, Result};

const BULK_LIMIT: i64 = 1000;

#[derive(Deserialize, ToSchema, Default)]
#[serde(rename_all = "camelCase")]
pub struct ReplayBody {
    pub endpoint_ids: Option<Vec<String>>,
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BulkReplayBody {
    pub since: String,
    pub status: Option<String>,
    pub endpoint_id: Option<String>,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ReplayResult {
    pub replayed: usize,
    pub delivery_ids: Vec<String>,
}

#[derive(Serialize, ToSchema)]
pub struct BulkReplayResult {
    pub replayed: usize,
}

struct Target {
    endpoint_id: String,
    event_id: String,
}

fn matches_event_type(event_type: &str, filter: Option<&Vec<String>>) -> bool {
    match filter {
        None => true,
        Some(list) if list.is_empty() => true,
        Some(list) => list.iter().any(|pattern| {
            pattern
                .strip_suffix('*')
                .map(|prefix| event_type.starts_with(prefix))
                .unwrap_or(pattern == event_type)
        }),
    }
}

async fn create_deliveries(
    state: &ApiState,
    tenant: &Tenant,
    targets: Vec<Target>,
) -> Result<Vec<String>> {
    if targets.is_empty() {
        return Ok(Vec::new());
    }

    let mut ids = Vec::with_capacity(targets.len());
    let mut event_ids = Vec::with_capacity(targets.len());
    let mut endpoint_ids = Vec::with_capacity(targets.len());
    for target in &targets {
        // A dropped element would leave a shorter array that UNNEST NULL pads,
        // cross wiring every row after it, so any parse failure aborts.
        event_ids.push(
            uuid::Uuid::parse_str(&target.event_id)
                .map_err(|_| Error::BadRequest("Invalid event id".to_owned()))?,
        );
        endpoint_ids.push(
            uuid::Uuid::parse_str(&target.endpoint_id)
                .map_err(|_| Error::BadRequest("Invalid endpoint id".to_owned()))?,
        );
        ids.push(uuid::Uuid::new_v4());
    }

    reserve_quota(
        state,
        &tenant.organization_id,
        tenant.monthly_limit,
        tenant.has_overage,
        targets.len() as i64,
    )
    .await?;

    // The pending row with next_attempt_at defaulting to now() is the enqueue, the worker polls it.
    sqlx::query(
        "INSERT INTO delivery (id, organization_id, event_id, endpoint_id, status, attempts, created_at) \
         SELECT id, $2::uuid, event_id, endpoint_id, 'pending', 0, now() \
         FROM UNNEST($1::uuid[], $3::uuid[], $4::uuid[]) AS t(id, event_id, endpoint_id)",
    )
    .bind(&ids)
    .bind(&tenant.organization_id)
    .bind(&event_ids)
    .bind(&endpoint_ids)
    .execute(&state.pool)
    .await?;

    Ok(ids.iter().map(uuid::Uuid::to_string).collect())
}

pub async fn replay_event(
    state: &ApiState,
    tenant: &Tenant,
    event_id: &str,
    body: ReplayBody,
) -> Result<ReplayResult> {
    let row = sqlx::query(
        "SELECT event_type FROM event \
         WHERE id = $1::uuid AND organization_id = $2::uuid LIMIT 1",
    )
    .bind(event_id)
    .bind(&tenant.organization_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| Error::NotFound("Event".to_owned()))?;

    let event_type: String = row.try_get("event_type")?;

    // Only endpoints subscribed to this event type receive the replay, matching
    // what the original delivery would have fanned out to.
    let targets: Vec<Target> = tenant
        .endpoints
        .iter()
        .filter(|endpoint| {
            body.endpoint_ids
                .as_ref()
                .is_none_or(|wanted| wanted.contains(&endpoint.id))
                && matches_event_type(&event_type, endpoint.events.as_ref())
        })
        .map(|endpoint| Target {
            endpoint_id: endpoint.id.clone(),
            event_id: event_id.to_owned(),
        })
        .collect();

    let delivery_ids = create_deliveries(state, tenant, targets).await?;
    Ok(ReplayResult {
        replayed: delivery_ids.len(),
        delivery_ids,
    })
}

pub async fn replay_bulk(
    state: &ApiState,
    tenant: &Tenant,
    body: BulkReplayBody,
) -> Result<BulkReplayResult> {
    let since = chrono::DateTime::parse_from_rfc3339(&body.since)
        .map_err(|_| Error::BadRequest("Invalid since date".to_owned()))?
        .naive_utc();

    let mut sql = String::from(
        "SELECT d.event_id::text AS event_id, d.endpoint_id::text AS endpoint_id \
         FROM delivery d \
         WHERE d.organization_id = $1::uuid AND d.created_at >= $2 AND d.status = $3",
    );
    if body.endpoint_id.is_some() {
        sql.push_str(" AND d.endpoint_id = $5::uuid");
    }
    sql.push_str(" LIMIT $4");

    let mut query = sqlx::query(&sql)
        .bind(&tenant.organization_id)
        .bind(since)
        .bind(body.status.as_deref().unwrap_or("failed"))
        .bind(BULK_LIMIT);
    if let Some(endpoint_id) = &body.endpoint_id {
        query = query.bind(endpoint_id);
    }

    let active: std::collections::HashSet<&str> =
        tenant.endpoints.iter().map(|e| e.id.as_str()).collect();

    let mut targets = Vec::new();
    for row in query.fetch_all(&state.pool).await? {
        let endpoint_id: String = row.try_get("endpoint_id")?;
        // An endpoint disabled since the failure is skipped rather than revived.
        if !active.contains(endpoint_id.as_str()) {
            continue;
        }
        targets.push(Target {
            endpoint_id,
            event_id: row.try_get("event_id")?,
        });
    }

    let delivery_ids = create_deliveries(state, tenant, targets).await?;
    Ok(BulkReplayResult {
        replayed: delivery_ids.len(),
    })
}
