use axum::{
    Router,
    routing::{get, post},
};
use redis::aio::ConnectionManager;
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tracing::info;

mod coalesce;
mod ingest;
mod redis_ops;

use coalesce::Coalescer;
use redis_ops::RedisOps;
use von_api::auth::Auth;
use von_billing::Meter;

pub struct AppState {
    pub auth: Arc<Auth>,
    pub coalescer: Arc<Coalescer>,
    pub redis: RedisOps,
    pub meter: Option<Arc<Meter>>,
}

/// Resolves on SIGINT, or SIGTERM where the platform has it, so container stops drain cleanly.
async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };

    #[cfg(unix)]
    let terminate = async {
        if let Ok(mut sig) =
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
        {
            sig.recv().await;
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {}
        _ = terminate => {}
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _ = dotenvy::dotenv();
    von_log::init();

    let redis_url =
        std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_owned());
    let database_url = std::env::var("DATABASE_URL")?;
    let port = std::env::var("PORT").unwrap_or_else(|_| "8090".to_owned());

    let client = redis::Client::open(redis_url.as_str())?;
    let conn = ConnectionManager::new(client).await?;
    let redis = RedisOps::new(conn.clone()).await?;

    let pool = PgPoolOptions::new()
        .max_connections(16)
        .connect(&database_url)
        .await?;

    von_migrate::run(&pool).await?;

    // Billing stays optional so self hosted deployments run without an Autumn account.
    let meter = std::env::var("AUTUMN_SECRET_KEY").ok().map(|key| {
        let feature = std::env::var("AUTUMN_FEATURE_ID")
            .unwrap_or_else(|_| von_billing::DEFAULT_FEATURE.to_owned());
        info!(feature, "billing enabled");
        Meter::new(key, feature)
    });

    let auth = Arc::new(Auth::new(pool.clone(), Some(conn.clone())));

    let state = Arc::new(AppState {
        auth: auth.clone(),
        coalescer: Coalescer::start(redis.clone()),
        redis,
        meter,
    });

    let api_state = Arc::new(von_api::ApiState {
        pool,
        redis: conn,
        auth,
        tunnels: Default::default(),
        instance_id: uuid::Uuid::new_v4().to_string(),
    });

    let app = Router::new()
        .route("/live", get(ingest::live))
        .route("/ready", get(ingest::ready))
        .route("/webhooks", post(ingest::post_webhook))
        .route("/webhooks/batch", post(ingest::post_batch))
        .with_state(state.clone())
        .merge(von_api::router().with_state(api_state));

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await?;
    info!(port, "von-ingest listening");

    let coalescer = state.coalescer.clone();
    axum::serve(listener, app)
        .with_graceful_shutdown(async move {
            shutdown_signal().await;
            info!("draining buffered events before exit");
            coalescer.drain().await;
            info!("drained");
        })
        .await?;

    Ok(())
}
