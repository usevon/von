use std::time::Duration;
use tokio::signal;
use tracing::{error, info};
use von_worker::{delivery, flusher, inbound};

const IDLE_SLEEP: Duration = Duration::from_millis(10);

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    von_log::init();

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(20)
        .connect(&std::env::var("DATABASE_URL")?)
        .await?;
    von_migrate::run(&pool).await?;

    let client = redis::Client::open(std::env::var("REDIS_URL")?)?;
    // The flusher's read blocks on its own socket so it can never stall delivery commands.
    let flusher_conn = redis::aio::ConnectionManager::new(client.clone()).await?;
    let conn = redis::aio::ConnectionManager::new(client).await?;

    let flusher = flusher::Flusher::new(pool.clone(), flusher_conn).await;
    let worker = delivery::Worker::new(pool.clone(), conn).await?;
    let inbound = inbound::Inbound::new(pool).await;

    info!("worker running");

    let loops = vec![
        // The flusher's read already blocks while idle, an extra sleep would only add latency.
        tokio::spawn(async move { pump(Duration::ZERO, || flusher.tick()).await }),
        tokio::spawn(async move { pump(IDLE_SLEEP, || worker.tick()).await }),
        tokio::spawn(async move { pump(IDLE_SLEEP, || inbound.tick()).await }),
    ];

    signal::ctrl_c().await?;
    for task in loops {
        task.abort();
    }
    info!("worker stopped");
    Ok(())
}

/// Backs off only when a tick found nothing, so a busy queue drains at full speed.
async fn pump<F, Fut>(idle: Duration, mut tick: F)
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = von_error::Result<usize>>,
{
    loop {
        match tick().await {
            Ok(0) if !idle.is_zero() => tokio::time::sleep(idle).await,
            Ok(_) => {}
            Err(err) => {
                error!(error = %err, "tick failed");
                tokio::time::sleep(Duration::from_millis(250)).await;
            }
        }
    }
}
