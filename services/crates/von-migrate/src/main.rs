use sqlx::postgres::PgPoolOptions;

/// Applies embedded migrations with run, or marks them applied with baseline
/// for a database created out of band whose schema already matches.
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    von_log::init();

    let command = std::env::args().nth(1);
    let command = command.as_deref();
    if command != Some("baseline") && command != Some("run") {
        eprintln!("usage: von-migrate <run|baseline>");
        std::process::exit(2);
    }

    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&std::env::var("DATABASE_URL")?)
        .await?;

    if command == Some("run") {
        von_migrate::run(&pool).await?;
        tracing::info!("migrations complete");
    } else {
        let marked = von_migrate::baseline(&pool).await?;
        tracing::info!(marked, "baseline complete");
    }
    Ok(())
}
