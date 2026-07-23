use crate::pagination::CursorSort;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct WebhookEvent {
    #[schema(format = "uuid")]
    pub id: String,
    pub event_type: String,
    #[schema(value_type = Object)]
    pub payload: Value,
    pub idempotency_key: Option<String>,
    #[schema(format = "date-time")]
    pub created_at: String,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct EventList {
    pub events: Vec<WebhookEvent>,
    pub next_cursor: Option<String>,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Delivery {
    #[schema(format = "uuid")]
    pub id: String,
    #[schema(format = "uuid")]
    pub event_id: String,
    #[schema(format = "uuid")]
    pub endpoint_id: String,
    pub status: String,
    pub attempts: i32,
    #[schema(format = "date-time")]
    pub last_attempt_at: Option<String>,
    #[schema(value_type = Object)]
    pub response: Option<Value>,
    #[schema(format = "date-time")]
    pub created_at: String,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeliveryList {
    pub deliveries: Vec<Delivery>,
    pub next_cursor: Option<String>,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeliveryAttempt {
    #[schema(format = "uuid")]
    pub id: String,
    #[schema(format = "uuid")]
    pub delivery_id: String,
    #[schema(format = "uuid")]
    pub event_id: String,
    #[schema(format = "uuid")]
    pub endpoint_id: String,
    pub attempt_number: i32,
    pub outcome: String,
    pub is_final: bool,
    pub http_status: Option<i32>,
    pub error: Option<String>,
    pub duration_ms: i32,
    pub queue_ms: Option<i32>,
    pub ttfb_ms: Option<i32>,
    pub transfer_ms: Option<i32>,
    pub response_body: Option<String>,
    #[schema(value_type = Object)]
    pub request_headers: Option<serde_json::Value>,
    #[schema(format = "date-time")]
    pub started_at: String,
    #[schema(format = "date-time")]
    pub finished_at: String,
    #[schema(format = "date-time")]
    pub created_at: String,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeliveryAttemptList {
    pub attempts: Vec<DeliveryAttempt>,
    pub next_cursor: Option<String>,
}

/// Elysia accepts a repeated `eventTypes` key, so the query type mirrors that
/// rather than a comma separated list.
#[derive(Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
#[serde(rename_all = "camelCase")]
pub struct EventQuery {
    #[param(max_length = 100)]
    #[serde(default)]
    pub event_types: Vec<String>,
    #[param(format = "date-time")]
    pub from: Option<String>,
    #[param(format = "date-time")]
    pub to: Option<String>,
    pub sort: Option<CursorSort>,
    #[param(minimum = 1, maximum = 100, example = 20)]
    pub limit: Option<i64>,
    pub cursor: Option<String>,
}

#[derive(Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
#[serde(rename_all = "camelCase")]
pub struct DeliveryQuery {
    pub status: Option<String>,
    #[param(format = "uuid")]
    pub endpoint_id: Option<String>,
    #[param(format = "date-time")]
    pub from: Option<String>,
    #[param(format = "date-time")]
    pub to: Option<String>,
    #[param(minimum = 1, maximum = 100, example = 20)]
    pub limit: Option<i64>,
    pub cursor: Option<String>,
}

#[derive(Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
#[serde(rename_all = "camelCase")]
pub struct DeliveryAttemptQuery {
    pub sort: Option<CursorSort>,
    #[param(minimum = 1, maximum = 100, example = 20)]
    pub limit: Option<i64>,
    pub cursor: Option<String>,
}
