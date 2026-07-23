use crate::state::ApiState;
use von_error::{Error, Result};
use von_types::{QUOTA_TTL, quota_key};

/// Reserves monthly quota before any rows are written, so a rejected batch never
/// leaves half created deliveries behind.
const RESERVE: &str = r#"
local quota_key = KEYS[1]
local limit = tonumber(ARGV[1])
local requested = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
local has_overage = tonumber(ARGV[4])
local current = tonumber(redis.call('GET', quota_key) or '0')
if has_overage == 0 and current + requested > limit then
  return {0, current}
end
local new_val = redis.call('INCRBY', quota_key, requested)
redis.call('EXPIRE', quota_key, ttl)
return {1, new_val}
"#;

pub async fn reserve_quota(
    state: &ApiState,
    organization_id: &str,
    limit: i64,
    has_overage: bool,
    requested: i64,
) -> Result<()> {
    let month = chrono::Utc::now().format("%Y-%m").to_string();
    let mut conn = state.redis.clone();
    let (ok, used): (i64, i64) = redis::cmd("EVAL")
        .arg(RESERVE)
        .arg(1)
        .arg(quota_key(organization_id, &month))
        .arg(limit)
        .arg(requested)
        .arg(QUOTA_TTL)
        .arg(i64::from(has_overage))
        .query_async(&mut conn)
        .await?;

    if ok == 1 {
        return Ok(());
    }
    Err(Error::QuotaExceeded { used, limit })
}
