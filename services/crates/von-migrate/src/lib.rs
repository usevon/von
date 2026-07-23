use sqlx::PgPool;
use sqlx::migrate::{MigrateError, Migrator};
use tracing::{info, warn};

static MIGRATOR: Migrator = sqlx::migrate!("../../migrations");

pub async fn run(pool: &PgPool) -> Result<(), MigrateError> {
    let before = applied_version(pool).await;

    if let Some((version, true)) = dirty_state(pool).await {
        warn!(version, "schema is in a dirty state, refusing to continue");
        return Err(MigrateError::Dirty(version));
    }

    MIGRATOR.run(pool).await?;

    let after = applied_version(pool).await;
    match (before, after) {
        (Some(from), Some(to)) if from == to => info!(version = to, "migrations up to date"),
        (from, Some(to)) => info!(from = from.unwrap_or(0), to, "migrations applied"),
        _ => info!("no migrations to apply"),
    }
    Ok(())
}

pub async fn baseline(pool: &PgPool) -> Result<usize, MigrateError> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS _sqlx_migrations ( \
         version BIGINT PRIMARY KEY, \
         description TEXT NOT NULL, \
         installed_on TIMESTAMPTZ NOT NULL DEFAULT now(), \
         success BOOLEAN NOT NULL, \
         checksum BYTEA NOT NULL, \
         execution_time BIGINT NOT NULL )",
    )
    .execute(pool)
    .await
    .map_err(MigrateError::from)?;

    let mut marked = 0;
    for migration in MIGRATOR.iter() {
        let inserted = sqlx::query(
            "INSERT INTO _sqlx_migrations \
             (version, description, installed_on, success, checksum, execution_time) \
             VALUES ($1, $2, now(), true, $3, 0) ON CONFLICT (version) DO NOTHING",
        )
        .bind(migration.version)
        .bind(migration.description.as_ref())
        .bind(migration.checksum.as_ref())
        .execute(pool)
        .await
        .map_err(MigrateError::from)?
        .rows_affected();

        if inserted > 0 {
            marked += 1;
            info!(
                version = migration.version,
                description = %migration.description,
                "marked as applied"
            );
        }
    }
    Ok(marked)
}

async fn applied_version(pool: &PgPool) -> Option<i64> {
    sqlx::query_scalar("SELECT max(version) FROM _sqlx_migrations WHERE success")
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
}

async fn dirty_state(pool: &PgPool) -> Option<(i64, bool)> {
    sqlx::query_as(
        "SELECT version, NOT success FROM _sqlx_migrations ORDER BY version DESC LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()
}
