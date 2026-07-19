use serde::{Deserialize, Serialize};
use serde_json::Number;
use utoipa::{IntoParams, ToSchema};
use von_error::{Error, Result};

const INTERVALS: [&str; 4] = ["5m", "15m", "1h", "1d"];
pub const DEFAULT_INTERVAL: &str = "1h";

/// JavaScript prints an integral number without a fractional part, so a rate of
/// exactly 100 has to serialize as 100 rather than 100.0 to match byte for byte.
pub fn number(value: f64) -> Number {
    if value.fract() == 0.0 && value.abs() < 9e15 {
        return Number::from(value as i64);
    }
    Number::from_f64(value).unwrap_or_else(|| Number::from(0))
}

/// Mirrors Number(x.toFixed(n)), which breaks ties away from zero rather than
/// to even like the Rust formatter does.
pub fn round(value: f64, precision: i32) -> f64 {
    let factor = 10f64.powi(precision);
    let scaled = value * factor;
    let rounded = if scaled >= 0.0 {
        (scaled + 0.5).floor()
    } else {
        (scaled - 0.5).ceil()
    };
    rounded / factor
}

pub fn rate(value: f64) -> Number {
    number(round(value * 100.0, 2))
}

#[derive(Deserialize, IntoParams)]
#[serde(rename_all = "camelCase")]
#[into_params(parameter_in = Query)]
pub struct AnalyticsQuery {
    /// Inclusive lower bound on createdAt.
    #[param(format = "date-time")]
    pub from: Option<String>,
    /// Inclusive upper bound on createdAt.
    #[param(format = "date-time")]
    pub to: Option<String>,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum TimeseriesInterval {
    #[serde(rename = "5m")]
    FiveMinutes,
    #[serde(rename = "15m")]
    FifteenMinutes,
    #[serde(rename = "1h")]
    OneHour,
    #[serde(rename = "1d")]
    OneDay,
}

#[derive(Deserialize, IntoParams)]
#[serde(rename_all = "camelCase")]
#[into_params(parameter_in = Query)]
pub struct TimeseriesQuery {
    #[param(format = "date-time")]
    pub from: Option<String>,
    #[param(format = "date-time")]
    pub to: Option<String>,
    #[param(inline, value_type = TimeseriesInterval)]
    pub interval: Option<String>,
}

impl TimeseriesQuery {
    pub fn interval(&self) -> Result<&str> {
        match self.interval.as_deref() {
            None => Ok(DEFAULT_INTERVAL),
            Some(value) if INTERVALS.contains(&value) => Ok(value),
            Some(_) => Err(Error::BadRequest(
                "interval must be one of 5m, 15m, 1h, 1d".to_owned(),
            )),
        }
    }
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct OverviewTotals {
    pub events: i64,
    pub deliveries: i64,
    pub delivered: i64,
    pub failed: i64,
    pub pending: i64,
    pub paused: i64,
    pub skipped: i64,
    pub circuit_open: i64,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct OverviewRates {
    #[schema(value_type = f64)]
    pub success_rate: Number,
    #[schema(value_type = f64)]
    pub failure_rate: Number,
    #[schema(value_type = f64)]
    pub retry_rate: Number,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Overview {
    pub totals: OverviewTotals,
    pub rates: OverviewRates,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TimeseriesBucket {
    #[schema(format = "date-time")]
    pub ts: String,
    pub deliveries: i64,
    pub delivered: i64,
    pub failed: i64,
    pub retries: i64,
    pub circuit_open: i64,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Timeseries {
    #[schema(value_type = TimeseriesInterval)]
    pub interval: String,
    pub buckets: Vec<TimeseriesBucket>,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RetriesTotals {
    pub deliveries: i64,
    pub deliveries_with_retry: i64,
    pub recovered_after_retry: i64,
    pub exhausted_retries: i64,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RetriesRates {
    #[schema(value_type = f64)]
    pub first_attempt_success_rate: Number,
    #[schema(value_type = f64)]
    pub retry_rate: Number,
    #[schema(value_type = f64)]
    pub recovered_after_retry_rate: Number,
    #[schema(value_type = f64)]
    pub average_attempts_per_delivery: Number,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RetriesByAttempt {
    pub attempt_number: i64,
    pub total: i64,
    pub successes: i64,
    pub failures: i64,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Retries {
    pub totals: RetriesTotals,
    pub rates: RetriesRates,
    pub attempts: Vec<RetriesByAttempt>,
}
