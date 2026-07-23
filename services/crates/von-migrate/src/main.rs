use sqlx::postgres::PgPoolOptions;

/// Marks every embedded migration as applied without running it, for a database
/// created out of band whose schema already matches.
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    von_log::init();

    if std::env::args().nth(1).as_deref() != Some("baseline") {
        eprintln!("usage: von-migrate baseline");
        std::process::exit(2);
    }

    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&std::env::var("DATABASE_URL")?)
        .await?;

    let marked = von_migrate::baseline(&pool).await?;
    tracing::info!(marked, "baseline complete");
    Ok(())
}
