// The from-scratch ingest hypothesis, HTTP to durable XADD with nothing else.
// No auth, no quota, no metering, no per-tenant coalescing, drive with stress.exe on 8092.

use axum::{Json, Router, extract::State, routing::post};
use redis::aio::ConnectionManager;
use serde::Deserialize;
use serde_json::value::RawValue;
use std::sync::Arc;
use tokio::sync::{mpsc, oneshot};

const STREAM: &str = "von:probe-floor";
const CONNS: usize = 8;
const MAX_PIPELINE: usize = 128;

#[derive(Deserialize)]
struct SendEvent {
    #[serde(rename = "eventType")]
    event_type: String,
    payload: Box<RawValue>,
}

struct Job {
    entry: String,
    done: oneshot::Sender<()>,
}

async fn webhook(
    State(tx): State<Arc<mpsc::UnboundedSender<Job>>>,
    Json(evt): Json<SendEvent>,
) -> Json<serde_json::Value> {
    let id = uuid::Uuid::new_v4().to_string();
    let entry = format!(
        r#"{{"id":"{id}","eventType":"{}","payload":{}}}"#,
        evt.event_type,
        evt.payload.get()
    );
    let (done, wait) = oneshot::channel();
    let _ = tx.send(Job { entry, done });
    let _ = wait.await;
    Json(serde_json::json!({ "created": 1, "events": [{ "id": id }] }))
}

async fn flush_loop(client: redis::Client, mut rx: mpsc::UnboundedReceiver<Job>) {
    let mut conns = Vec::new();
    for _ in 0..CONNS {
        conns.push(ConnectionManager::new(client.clone()).await.unwrap());
    }
    let slots = Arc::new(tokio::sync::Semaphore::new(CONNS));
    let mut next = 0usize;

    while let Some(first) = rx.recv().await {
        let mut jobs = vec![first];
        while jobs.len() < MAX_PIPELINE {
            match rx.try_recv() {
                Ok(job) => jobs.push(job),
                Err(_) => break,
            }
        }
        let permit = slots.clone().acquire_owned().await.unwrap();
        let mut conn = conns[next % CONNS].clone();
        next += 1;
        tokio::spawn(async move {
            let mut pipe = redis::pipe();
            for job in &jobs {
                pipe.cmd("XADD")
                    .arg(STREAM)
                    .arg("MAXLEN")
                    .arg("~")
                    .arg(10000)
                    .arg("*")
                    .arg("data")
                    .arg(&job.entry)
                    .ignore();
            }
            let ok: redis::RedisResult<()> = pipe.query_async(&mut conn).await;
            drop(permit);
            if ok.is_ok() {
                for job in jobs {
                    let _ = job.done.send(());
                }
            }
        });
    }
}

#[tokio::main]
async fn main() {
    let url =
        std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:16379".to_owned());
    let client = redis::Client::open(url.as_str()).unwrap();
    let (tx, rx) = mpsc::unbounded_channel();
    tokio::spawn(flush_loop(client, rx));

    let app = Router::new()
        .route("/webhooks", post(webhook))
        .with_state(Arc::new(tx));
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8092").await.unwrap();
    println!("e2e_floor on 8092, run stress.exe http://127.0.0.1:8092/webhooks <any-key>");
    axum::serve(listener, app).await.unwrap();
}
