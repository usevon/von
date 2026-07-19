use crate::auth::Tenant;
use crate::queue::{enqueue_deliveries, reserve_quota};
use crate::state::ApiState;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use utoipa::ToSchema;
use von_error::{Error, Result};
use von_types::DeliveryJob;

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
    event_type: String,
    payload: String,
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

async fn create_and_enqueue(
    state: &ApiState,
    tenant: &Tenant,
    targets: Vec<Target>,
) -> Result<Vec<String>> {
    if targets.is_empty() {
        return Ok(Vec::new());
    }

    reserve_quota(
        state,
        &tenant.organization_id,
        tenant.monthly_limit,
        tenant.has_overage,
        targets.len() as i64,
    )
    .await?;

    let ids: Vec<uuid::Uuid> = targets.iter().map(|_| uuid::Uuid::new_v4()).collect();
    let event_ids: Vec<uuid::Uuid> = targets
        .iter()
        .filter_map(|t| uuid::Uuid::parse_str(&t.event_id).ok())
        .collect();
    let endpoint_ids: Vec<uuid::Uuid> = targets
        .iter()
        .filter_map(|t| uuid::Uuid::parse_str(&t.endpoint_id).ok())
        .collect();

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

    let jobs: Vec<DeliveryJob> = targets
        .iter()
        .zip(&ids)
        .map(|(target, id)| DeliveryJob {
            delivery_id: id.to_string(),
            event_id: target.event_id.clone(),
            endpoint_id: target.endpoint_id.clone(),
            organization_id: tenant.organization_id.clone(),
            event_type: target.event_type.clone(),
            payload: target.payload.clone(),
            plan: tenant.plan.clone(),
        })
        .collect();

    enqueue_deliveries(state, &jobs).await?;
    Ok(ids.iter().map(uuid::Uuid::to_string).collect())
}

pub async fn replay_event(
    state: &ApiState,
    tenant: &Tenant,
    event_id: &str,
    body: ReplayBody,
) -> Result<ReplayResult> {
    let row = sqlx::query(
        "SELECT event_type, payload::text AS payload FROM event \
         WHERE id = $1::uuid AND organization_id = $2::uuid LIMIT 1",
    )
    .bind(event_id)
    .bind(&tenant.organization_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| Error::NotFound("Event".to_owned()))?;

    let event_type: String = row.try_get("event_type")?;
    let payload: String = row.try_get("payload")?;

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
            event_type: event_type.clone(),
            payload: payload.clone(),
        })
        .collect();

    let delivery_ids = create_and_enqueue(state, tenant, targets).await?;
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
        "SELECT d.event_id::text AS event_id, d.endpoint_id::text AS endpoint_id, \
         e.event_type, e.payload::text AS payload \
         FROM delivery d INNER JOIN event e ON d.event_id = e.id \
         WHERE e.organization_id = $1::uuid AND d.created_at >= $2 AND d.status = $3",
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
            event_type: row.try_get("event_type")?,
            payload: row.try_get("payload")?,
        });
    }

    let delivery_ids = create_and_enqueue(state, tenant, targets).await?;
    Ok(BulkReplayResult {
        replayed: delivery_ids.len(),
    })
}
