use super::model::{
    Delivery, DeliveryAttempt, DeliveryAttemptList, DeliveryAttemptQuery, DeliveryList,
    DeliveryQuery, EventList, EventQuery, WebhookEvent,
};
use crate::pagination::{
    CursorPosition, CursorSort, clamp_limit, decode_cursor_sorted, encode_cursor_sorted,
    scope_hash_fields,
};
use crate::state::ApiState;
use chrono::{DateTime, NaiveDateTime, Utc};
use serde_json::{Value, json};
use sqlx::Row;
use sqlx::postgres::PgRow;
use von_error::{Error, Result};

const EVENT_COLUMNS: &str = "id::text AS id, event_type, payload, idempotency_key, created_at";
const DELIVERY_COLUMNS: &str = "d.id::text AS id, d.event_id::text AS event_id, \
     d.endpoint_id::text AS endpoint_id, d.status, d.attempts, d.last_attempt_at, \
     d.response, d.created_at";
const ATTEMPT_COLUMNS: &str = "id::text AS id, delivery_id::text AS delivery_id, \
     event_id::text AS event_id, endpoint_id::text AS endpoint_id, attempt_number, \
     outcome, is_final, http_status, error, duration_ms, started_at, finished_at, created_at";

fn to_iso(value: NaiveDateTime) -> String {
    value.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()
}

fn to_iso_opt(value: Option<NaiveDateTime>) -> Option<String> {
    value.map(to_iso)
}

/// Mirrors `parseOptionalDate`, which rejects anything `new Date` cannot read.
fn parse_date(value: Option<&String>, field: &str) -> Result<Option<DateTime<Utc>>> {
    let Some(raw) = value.filter(|v| !v.is_empty()) else {
        return Ok(None);
    };
    let parsed = DateTime::parse_from_rfc3339(raw)
        .map(|d| d.with_timezone(&Utc))
        .or_else(|_| {
            raw.parse::<chrono::NaiveDate>()
                .map(|d| DateTime::from_naive_utc_and_offset(d.and_hms_opt(0, 0, 0).unwrap(), Utc))
        })
        .map_err(|_| Error::BadRequest(format!("Invalid {field} date")))?;
    Ok(Some(parsed))
}

fn check_range(from: Option<DateTime<Utc>>, to: Option<DateTime<Utc>>) -> Result<()> {
    if let (Some(from), Some(to)) = (from, to)
        && from > to
    {
        return Err(Error::BadRequest(
            "from must be before or equal to to".to_owned(),
        ));
    }
    Ok(())
}

/// The scope hash hashes the ISO strings the TypeScript service produced, so the
/// milliseconds have to be rendered the same way.
fn scope_date(value: Option<DateTime<Utc>>) -> Value {
    match value {
        Some(date) => json!(to_iso(date.naive_utc())),
        None => Value::Null,
    }
}

fn to_event(row: &PgRow) -> Result<WebhookEvent> {
    Ok(WebhookEvent {
        id: row.try_get("id")?,
        event_type: row.try_get("event_type")?,
        payload: row.try_get("payload")?,
        idempotency_key: row.try_get("idempotency_key")?,
        created_at: to_iso(row.try_get("created_at")?),
    })
}

fn to_delivery(row: &PgRow) -> Result<Delivery> {
    Ok(Delivery {
        id: row.try_get("id")?,
        event_id: row.try_get("event_id")?,
        endpoint_id: row.try_get("endpoint_id")?,
        status: row.try_get("status")?,
        attempts: row.try_get("attempts")?,
        last_attempt_at: to_iso_opt(row.try_get("last_attempt_at")?),
        response: row.try_get("response")?,
        created_at: to_iso(row.try_get("created_at")?),
    })
}

fn to_attempt(row: &PgRow) -> Result<DeliveryAttempt> {
    Ok(DeliveryAttempt {
        id: row.try_get("id")?,
        delivery_id: row.try_get("delivery_id")?,
        event_id: row.try_get("event_id")?,
        endpoint_id: row.try_get("endpoint_id")?,
        attempt_number: row.try_get("attempt_number")?,
        outcome: row.try_get("outcome")?,
        is_final: row.try_get("is_final")?,
        http_status: row.try_get("http_status")?,
        error: row.try_get("error")?,
        duration_ms: row.try_get("duration_ms")?,
        started_at: to_iso(row.try_get("started_at")?),
        finished_at: to_iso(row.try_get("finished_at")?),
        created_at: to_iso(row.try_get("created_at")?),
    })
}

/// Trims the extra lookahead row and builds the cursor from whatever is left.
fn finish_page(
    rows: &mut Vec<PgRow>,
    limit: i64,
    scope: &str,
    sort: CursorSort,
    created_at_column: &str,
) -> Result<Option<String>> {
    let has_more = rows.len() > limit as usize;
    rows.truncate(limit as usize);

    let Some(last) = rows.last().filter(|_| has_more) else {
        return Ok(None);
    };

    encode_cursor_sorted(
        &CursorPosition {
            created_at: DateTime::from_naive_utc_and_offset(last.try_get(created_at_column)?, Utc),
            id: last.try_get("id")?,
        },
        scope,
        sort,
    )
    .map(Some)
}

fn cursor_uuid(position: &CursorPosition) -> Result<uuid::Uuid> {
    uuid::Uuid::parse_str(&position.id).map_err(|_| Error::BadRequest("Invalid cursor".to_owned()))
}

pub async fn get_events(
    state: &ApiState,
    organization_id: &str,
    query: &EventQuery,
) -> Result<EventList> {
    let sort = query.sort.unwrap_or(CursorSort::Desc);
    let from = parse_date(query.from.as_ref(), "from")?;
    let to = parse_date(query.to.as_ref(), "to")?;
    check_range(from, to)?;
    let limit = clamp_limit(query.limit);

    let event_types = if query.event_types.is_empty() {
        None
    } else {
        let mut sorted = query.event_types.clone();
        sorted.sort();
        Some(sorted)
    };

    let scope = scope_hash_fields(&[
        ("resource", json!("webhook-events")),
        ("organizationId", json!(organization_id)),
        ("eventTypes", json!(event_types)),
        ("from", scope_date(from)),
        ("to", scope_date(to)),
        ("sort", json!(sort.as_str())),
    ]);
    let cursor = decode_cursor_sorted(query.cursor.as_deref(), &scope, sort)?;

    let mut sql = format!("SELECT {EVENT_COLUMNS} FROM event WHERE organization_id = $1::uuid");
    let mut next = 3;
    if !query.event_types.is_empty() {
        sql.push_str(&format!(" AND event_type = ANY(${next})"));
        next += 1;
    }
    if from.is_some() {
        sql.push_str(&format!(" AND created_at >= ${next}"));
        next += 1;
    }
    if to.is_some() {
        sql.push_str(&format!(" AND created_at <= ${next}"));
        next += 1;
    }
    if cursor.is_some() {
        let cmp = sort.compare();
        sql.push_str(&format!(
            " AND (created_at {cmp} ${next} OR (created_at = ${next} AND id {cmp} ${}))",
            next + 1
        ));
    }
    let order = sort.order();
    sql.push_str(&format!(
        " ORDER BY created_at {order}, id {order} LIMIT $2"
    ));

    let mut db_query = sqlx::query(&sql).bind(organization_id).bind(limit + 1);
    if !query.event_types.is_empty() {
        db_query = db_query.bind(&query.event_types);
    }
    if let Some(from) = from {
        db_query = db_query.bind(from.naive_utc());
    }
    if let Some(to) = to {
        db_query = db_query.bind(to.naive_utc());
    }
    if let Some(position) = &cursor {
        db_query = db_query
            .bind(position.created_at.naive_utc())
            .bind(cursor_uuid(position)?);
    }

    let mut rows = db_query.fetch_all(&state.pool).await?;
    let next_cursor = finish_page(&mut rows, limit, &scope, sort, "created_at")?;

    Ok(EventList {
        events: rows.iter().map(to_event).collect::<Result<Vec<_>>>()?,
        next_cursor,
    })
}

pub async fn get_event(
    state: &ApiState,
    organization_id: &str,
    event_id: &str,
) -> Result<Option<WebhookEvent>> {
    let row = sqlx::query(&format!(
        "SELECT {EVENT_COLUMNS} FROM event WHERE id = $1::uuid AND organization_id = $2::uuid LIMIT 1"
    ))
    .bind(event_id)
    .bind(organization_id)
    .fetch_optional(&state.pool)
    .await?;

    row.as_ref().map(to_event).transpose()
}

pub async fn get_deliveries(
    state: &ApiState,
    organization_id: &str,
    event_id: &str,
    query: &DeliveryQuery,
) -> Result<DeliveryList> {
    let from = parse_date(query.from.as_ref(), "from")?;
    let to = parse_date(query.to.as_ref(), "to")?;
    check_range(from, to)?;
    let limit = clamp_limit(query.limit);
    let sort = CursorSort::Desc;

    let scope = scope_hash_fields(&[
        ("resource", json!("webhook-deliveries")),
        ("organizationId", json!(organization_id)),
        ("eventId", json!(event_id)),
        ("status", json!(query.status)),
        ("endpointId", json!(query.endpoint_id)),
        ("from", scope_date(from)),
        ("to", scope_date(to)),
        ("sort", json!(sort.as_str())),
    ]);
    let cursor = decode_cursor_sorted(query.cursor.as_deref(), &scope, sort)?;

    let mut sql = format!(
        "SELECT {DELIVERY_COLUMNS} FROM delivery d \
         WHERE d.event_id = $1::uuid AND d.organization_id = $2::uuid"
    );
    let mut next = 4;
    if query.status.is_some() {
        sql.push_str(&format!(" AND d.status = ${next}"));
        next += 1;
    }
    if query.endpoint_id.is_some() {
        sql.push_str(&format!(" AND d.endpoint_id = ${next}::uuid"));
        next += 1;
    }
    if from.is_some() {
        sql.push_str(&format!(" AND d.created_at >= ${next}"));
        next += 1;
    }
    if to.is_some() {
        sql.push_str(&format!(" AND d.created_at <= ${next}"));
        next += 1;
    }
    if cursor.is_some() {
        sql.push_str(&format!(
            " AND (d.created_at < ${next} OR (d.created_at = ${next} AND d.id < ${}))",
            next + 1
        ));
    }
    sql.push_str(" ORDER BY d.created_at DESC, d.id DESC LIMIT $3");

    let mut db_query = sqlx::query(&sql)
        .bind(event_id)
        .bind(organization_id)
        .bind(limit + 1);
    if let Some(status) = &query.status {
        db_query = db_query.bind(status);
    }
    if let Some(endpoint_id) = &query.endpoint_id {
        db_query = db_query.bind(endpoint_id);
    }
    if let Some(from) = from {
        db_query = db_query.bind(from.naive_utc());
    }
    if let Some(to) = to {
        db_query = db_query.bind(to.naive_utc());
    }
    if let Some(position) = &cursor {
        db_query = db_query
            .bind(position.created_at.naive_utc())
            .bind(cursor_uuid(position)?);
    }

    let mut rows = db_query.fetch_all(&state.pool).await?;
    let next_cursor = finish_page(&mut rows, limit, &scope, sort, "created_at")?;

    Ok(DeliveryList {
        deliveries: rows.iter().map(to_delivery).collect::<Result<Vec<_>>>()?,
        next_cursor,
    })
}

pub async fn get_delivery_attempts(
    state: &ApiState,
    organization_id: &str,
    delivery_id: &str,
    query: &DeliveryAttemptQuery,
) -> Result<DeliveryAttemptList> {
    let sort = query.sort.unwrap_or(CursorSort::Asc);
    let limit = clamp_limit(query.limit);

    let scope = scope_hash_fields(&[
        ("resource", json!("webhook-delivery-attempts")),
        ("organizationId", json!(organization_id)),
        ("deliveryId", json!(delivery_id)),
        ("sort", json!(sort.as_str())),
    ]);
    let cursor = decode_cursor_sorted(query.cursor.as_deref(), &scope, sort)?;

    let mut sql = format!(
        "SELECT {ATTEMPT_COLUMNS} FROM delivery_attempt \
         WHERE organization_id = $1::uuid AND delivery_id = $2::uuid"
    );
    if cursor.is_some() {
        let cmp = sort.compare();
        sql.push_str(&format!(
            " AND (created_at {cmp} $4 OR (created_at = $4 AND id {cmp} $5))"
        ));
    }
    let order = sort.order();
    sql.push_str(&format!(
        " ORDER BY created_at {order}, id {order} LIMIT $3"
    ));

    let mut db_query = sqlx::query(&sql)
        .bind(organization_id)
        .bind(delivery_id)
        .bind(limit + 1);
    if let Some(position) = &cursor {
        db_query = db_query
            .bind(position.created_at.naive_utc())
            .bind(cursor_uuid(position)?);
    }

    let mut rows = db_query.fetch_all(&state.pool).await?;
    let next_cursor = finish_page(&mut rows, limit, &scope, sort, "created_at")?;

    Ok(DeliveryAttemptList {
        attempts: rows.iter().map(to_attempt).collect::<Result<Vec<_>>>()?,
        next_cursor,
    })
}
