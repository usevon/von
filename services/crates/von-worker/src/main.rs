use std::time::Duration;
use tokio::signal;
use von_worker::{delivery, flusher, inbound};

const IDLE_SLEEP: Duration = Duration::from_millis(10);

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(20)
        .connect(&std::env::var("DATABASE_URL")?)
        .await?;
    let client = redis::Client::open(std::env::var("REDIS_URL")?)?;
    let conn = redis::aio::ConnectionManager::new(client).await?;

    let flusher = flusher::Flusher::new(pool.clone(), conn.clone()).await;
    let worker = delivery::Worker::new(pool.clone(), conn.clone()).await?;
    let inbound = inbound::Inbound::new(pool, conn).await;

    println!("worker running");

    let loops = vec![
        tokio::spawn(async move { pump(|| flusher.tick()).await }),
        tokio::spawn(async move { pump(|| worker.tick()).await }),
        tokio::spawn(async move { pump(|| inbound.tick()).await }),
    ];

    signal::ctrl_c().await?;
    for task in loops {
        task.abort();
    }
    println!("worker stopped");
    Ok(())
}

/// Backs off only when a tick found nothing, so a busy queue drains at full speed.
async fn pump<F, Fut>(mut tick: F)
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = von_error::Result<usize>>,
{
    loop {
        match tick().await {
            Ok(0) => tokio::time::sleep(IDLE_SLEEP).await,
            Ok(_) => {}
            Err(err) => {
                eprintln!("tick failed: {err}");
                tokio::time::sleep(Duration::from_millis(250)).await;
            }
        }
    }
}
