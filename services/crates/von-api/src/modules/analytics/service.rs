use super::model::{
    AnalyticsQuery, Overview, OverviewRates, OverviewTotals, Retries, RetriesByAttempt,
    RetriesRates, RetriesTotals, Timeseries, TimeseriesBucket, TimeseriesQuery, number, rate,
    round,
};
use crate::state::ApiState;
use crate::to_iso;
use chrono::{DateTime, NaiveDate, NaiveDateTime};
use sqlx::Row;
use sqlx::postgres::PgRow;
use von_error::{Error, Result};

/// Accepts what `new Date(value)` accepts for the formats the dashboard sends,
/// treating a bare datetime as UTC because both services run with TZ=UTC.
fn parse_optional_date(value: Option<&String>, field: &str) -> Result<Option<NaiveDateTime>> {
    let Some(value) = value.filter(|v| !v.is_empty()) else {
        return Ok(None);
    };

    if let Ok(parsed) = DateTime::parse_from_rfc3339(value) {
        return Ok(Some(parsed.naive_utc()));
    }
    if let Ok(parsed) = NaiveDateTime::parse_from_str(value, "%Y-%m-%dT%H:%M:%S%.f") {
        return Ok(Some(parsed));
    }
    if let Ok(parsed) = NaiveDateTime::parse_from_str(value, "%Y-%m-%dT%H:%M") {
        return Ok(Some(parsed));
    }
    if let Ok(parsed) = NaiveDate::parse_from_str(value, "%Y-%m-%d") {
        return Ok(Some(parsed.and_hms_opt(0, 0, 0).unwrap_or_default()));
    }

    Err(Error::BadRequest(format!("Invalid {field} date")))
}

fn validate_range(from: Option<NaiveDateTime>, to: Option<NaiveDateTime>) -> Result<()> {
    match (from, to) {
        (Some(from), Some(to)) if from > to => Err(Error::BadRequest(
            "from must be before or equal to to".to_owned(),
        )),
        _ => Ok(()),
    }
}

struct Range {
    from: Option<NaiveDateTime>,
    to: Option<NaiveDateTime>,
}

impl Range {
    fn parse(from: Option<&String>, to: Option<&String>) -> Result<Self> {
        let from = parse_optional_date(from, "from")?;
        let to = parse_optional_date(to, "to")?;
        validate_range(from, to)?;
        Ok(Self { from, to })
    }

    fn where_clause(&self, column: &str) -> String {
        let mut sql = format!(" WHERE {column}.organization_id = $1::uuid");
        let mut next = 2;
        if self.from.is_some() {
            sql.push_str(&format!(" AND {column}.created_at >= ${next}"));
            next += 1;
        }
        if self.to.is_some() {
            sql.push_str(&format!(" AND {column}.created_at <= ${next}"));
        }
        sql
    }

    fn bind<'q>(
        &self,
        query: sqlx::query::Query<'q, sqlx::Postgres, sqlx::postgres::PgArguments>,
    ) -> sqlx::query::Query<'q, sqlx::Postgres, sqlx::postgres::PgArguments> {
        let mut query = query;
        if let Some(from) = self.from {
            query = query.bind(from);
        }
        if let Some(to) = self.to {
            query = query.bind(to);
        }
        query
    }
}

fn count(row: &PgRow, column: &str) -> Result<i64> {
    Ok(i64::from(row.try_get::<i32, _>(column)?))
}

/// A sum over zero rows is null, which the TypeScript service coalesces to zero.
fn sum(row: &PgRow, column: &str) -> Result<i64> {
    Ok(row
        .try_get::<Option<i32>, _>(column)?
        .map(i64::from)
        .unwrap_or(0))
}

fn ratio(numerator: i64, denominator: i64) -> serde_json::Number {
    if denominator > 0 {
        rate(numerator as f64 / denominator as f64)
    } else {
        number(0.0)
    }
}

const DELIVERY_STATUS_SUMS: &str = "sum(case when delivery.status = 'delivered' then 1 else 0 end)::int AS delivered, \
     sum(case when delivery.status = 'failed' then 1 else 0 end)::int AS failed, \
     sum(case when delivery.status = 'pending' then 1 else 0 end)::int AS pending, \
     sum(case when delivery.status = 'paused' then 1 else 0 end)::int AS paused, \
     sum(case when delivery.status = 'skipped' then 1 else 0 end)::int AS skipped, \
     sum(case when delivery.status = 'circuit_open' then 1 else 0 end)::int AS circuit_open, \
     sum(case when delivery.attempts > 1 then 1 else 0 end)::int AS retries";

pub async fn get_overview(
    state: &ApiState,
    organization_id: &str,
    query: &AnalyticsQuery,
) -> Result<Overview> {
    let range = Range::parse(query.from.as_ref(), query.to.as_ref())?;

    let delivery_sql = format!(
        "SELECT count(*)::int AS deliveries, {DELIVERY_STATUS_SUMS} FROM delivery{}",
        range.where_clause("delivery")
    );
    let event_sql = format!(
        "SELECT count(*)::int AS events FROM event{}",
        range.where_clause("event")
    );

    let delivery_row = range
        .bind(sqlx::query(&delivery_sql).bind(organization_id))
        .fetch_one(&state.pool)
        .await?;
    let event_row = range
        .bind(sqlx::query(&event_sql).bind(organization_id))
        .fetch_one(&state.pool)
        .await?;

    let deliveries = count(&delivery_row, "deliveries")?;
    let delivered = sum(&delivery_row, "delivered")?;
    let failed = sum(&delivery_row, "failed")?;
    let retries = sum(&delivery_row, "retries")?;

    Ok(Overview {
        totals: OverviewTotals {
            events: count(&event_row, "events")?,
            deliveries,
            delivered,
            failed,
            pending: sum(&delivery_row, "pending")?,
            paused: sum(&delivery_row, "paused")?,
            skipped: sum(&delivery_row, "skipped")?,
            circuit_open: sum(&delivery_row, "circuit_open")?,
        },
        rates: OverviewRates {
            success_rate: ratio(delivered, deliveries),
            failure_rate: ratio(failed, deliveries),
            retry_rate: ratio(retries, deliveries),
        },
    })
}

fn bucket_expression(interval: &str) -> &'static str {
    match interval {
        "5m" => {
            "date_trunc('hour', delivery.created_at) + floor(extract(minute from delivery.created_at) / 5) * interval '5 minute'"
        }
        "15m" => {
            "date_trunc('hour', delivery.created_at) + floor(extract(minute from delivery.created_at) / 15) * interval '15 minute'"
        }
        "1d" => "date_trunc('day', delivery.created_at)",
        _ => "date_trunc('hour', delivery.created_at)",
    }
}

pub async fn get_timeseries(
    state: &ApiState,
    organization_id: &str,
    query: &TimeseriesQuery,
) -> Result<Timeseries> {
    let range = Range::parse(query.from.as_ref(), query.to.as_ref())?;
    let interval = query.interval()?;

    let sql = format!(
        "SELECT {} AS bucket, count(*)::int AS deliveries, \
         sum(case when delivery.status = 'delivered' then 1 else 0 end)::int AS delivered, \
         sum(case when delivery.status = 'failed' then 1 else 0 end)::int AS failed, \
         sum(case when delivery.attempts > 1 then 1 else 0 end)::int AS retries, \
         sum(case when delivery.status = 'circuit_open' then 1 else 0 end)::int AS circuit_open \
         FROM delivery{} GROUP BY bucket ORDER BY bucket",
        bucket_expression(interval),
        range.where_clause("delivery")
    );

    let rows = range
        .bind(sqlx::query(&sql).bind(organization_id))
        .fetch_all(&state.pool)
        .await?;

    let buckets = rows
        .iter()
        .map(|row| {
            Ok(TimeseriesBucket {
                ts: to_iso(row.try_get("bucket")?),
                deliveries: count(row, "deliveries")?,
                delivered: sum(row, "delivered")?,
                failed: sum(row, "failed")?,
                retries: sum(row, "retries")?,
                circuit_open: sum(row, "circuit_open")?,
            })
        })
        .collect::<Result<Vec<_>>>()?;

    Ok(Timeseries {
        interval: interval.to_owned(),
        buckets,
    })
}

pub async fn get_retries(
    state: &ApiState,
    organization_id: &str,
    query: &AnalyticsQuery,
) -> Result<Retries> {
    let range = Range::parse(query.from.as_ref(), query.to.as_ref())?;

    let totals_sql = format!(
        "SELECT count(*)::int AS deliveries, \
         sum(case when delivery.attempts > 1 then 1 else 0 end)::int AS deliveries_with_retry, \
         sum(case when delivery.status = 'delivered' and delivery.attempts > 1 then 1 else 0 end)::int AS recovered_after_retry, \
         sum(case when delivery.status = 'failed' and delivery.attempts > 1 then 1 else 0 end)::int AS exhausted_retries, \
         sum(case when delivery.status = 'delivered' and delivery.attempts = 1 then 1 else 0 end)::int AS first_attempt_successes, \
         coalesce(avg(delivery.attempts)::float, 0) AS avg_attempts \
         FROM delivery{}",
        range.where_clause("delivery")
    );
    let attempts_sql = format!(
        "SELECT delivery_attempt.attempt_number AS attempt_number, count(*)::int AS total, \
         sum(case when delivery_attempt.outcome = 'success' then 1 else 0 end)::int AS successes, \
         sum(case when delivery_attempt.outcome = 'failure' then 1 else 0 end)::int AS failures \
         FROM delivery_attempt{} GROUP BY attempt_number ORDER BY attempt_number",
        range.where_clause("delivery_attempt")
    );

    let totals_row = range
        .bind(sqlx::query(&totals_sql).bind(organization_id))
        .fetch_one(&state.pool)
        .await?;
    let attempt_rows = range
        .bind(sqlx::query(&attempts_sql).bind(organization_id))
        .fetch_all(&state.pool)
        .await?;

    let deliveries = count(&totals_row, "deliveries")?;
    let deliveries_with_retry = sum(&totals_row, "deliveries_with_retry")?;
    let recovered_after_retry = sum(&totals_row, "recovered_after_retry")?;
    let first_attempt_successes = sum(&totals_row, "first_attempt_successes")?;
    let avg_attempts: f64 = totals_row.try_get("avg_attempts")?;

    let attempts = attempt_rows
        .iter()
        .map(|row| {
            Ok(RetriesByAttempt {
                attempt_number: i64::from(row.try_get::<i32, _>("attempt_number")?),
                total: count(row, "total")?,
                successes: sum(row, "successes")?,
                failures: sum(row, "failures")?,
            })
        })
        .collect::<Result<Vec<_>>>()?;

    Ok(Retries {
        totals: RetriesTotals {
            deliveries,
            deliveries_with_retry,
            recovered_after_retry,
            exhausted_retries: sum(&totals_row, "exhausted_retries")?,
        },
        rates: RetriesRates {
            first_attempt_success_rate: ratio(first_attempt_successes, deliveries),
            retry_rate: ratio(deliveries_with_retry, deliveries),
            recovered_after_retry_rate: ratio(recovered_after_retry, deliveries_with_retry),
            average_attempts_per_delivery: number(round(avg_attempts, 2)),
        },
        attempts,
    })
}
