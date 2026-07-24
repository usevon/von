// Pure HTTP plus serde ceiling, no auth, no Redis, drive with stress.exe against port 8091.

use axum::{Json, Router, routing::post};
use serde::Deserialize;
use serde_json::value::RawValue;

#[derive(Deserialize)]
struct SendEvent {
    #[serde(rename = "eventType")]
    event_type: String,
    payload: Box<RawValue>,
    #[serde(rename = "idempotencyKey")]
    idempotency_key: Option<String>,
}

async fn webhook(Json(evt): Json<SendEvent>) -> Json<serde_json::Value> {
    let id = uuid::Uuid::new_v4().to_string();
    Json(serde_json::json!({
        "created": 1,
        "events": [{
            "id": id,
            "eventType": evt.event_type,
            "idempotencyKey": evt.idempotency_key,
            "createdAt": "2026-01-01T00:00:00Z",
            "payloadBytes": evt.payload.get().len(),
        }]
    }))
}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/webhooks", post(webhook));
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8091").await.unwrap();
    println!("http_floor on 8091, run stress.exe http://127.0.0.1:8091/webhooks <any-key>");
    axum::serve(listener, app).await.unwrap();
}
