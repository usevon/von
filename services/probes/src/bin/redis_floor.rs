// Redis write ceiling without HTTP, quantifies the Lua ARGV tax and connection scaling.
// Args, mode (xadd|evalsha) payload_bytes connections pipeline_depth total_ops.

use redis::aio::ConnectionManager;
use std::time::Instant;
use von_probes::{mbps, pct};

const STREAM: &str = "von:probe-floor";

// The real reserve script with a MAXLEN cap added so a probe run cannot OOM Redis.
const RESERVE: &str = r#"
local quota_key = KEYS[1]
local rate_key = KEYS[2]
local limit = tonumber(ARGV[1])
local requested = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
local has_overage = tonumber(ARGV[4])
local stream_key = ARGV[5]
local payload = ARGV[6]
local rate_max = tonumber(ARGV[7])
local rate_window = tonumber(ARGV[8])
local rate_cost = tonumber(ARGV[9])

if rate_max > 0 then
  local used = tonumber(redis.call('GET', rate_key) or '0')
  if used >= rate_max then
    return {-1, 0, ''}
  end
  local total = redis.call('INCRBY', rate_key, rate_cost)
  if total == rate_cost then
    redis.call('EXPIRE', rate_key, rate_window)
  end
end

local current = tonumber(redis.call('GET', quota_key) or '0')

if has_overage == 0 and current + requested > limit then
  return {0, current, ''}
end

local new_val = redis.call('INCRBY', quota_key, requested)
redis.call('EXPIRE', quota_key, ttl)

local stream_id = redis.call('XADD', stream_key, 'MAXLEN', '~', '10000', '*', 'data', payload)

return {1, new_val, stream_id}
"#;

#[tokio::main]
async fn main() {
    let args: Vec<String> = std::env::args().collect();
    let mode = args.get(1).cloned().unwrap_or_else(|| "xadd".to_owned());
    let size: usize = args.get(2).and_then(|v| v.parse().ok()).unwrap_or(65536);
    let conns: usize = args.get(3).and_then(|v| v.parse().ok()).unwrap_or(4);
    let depth: usize = args.get(4).and_then(|v| v.parse().ok()).unwrap_or(16);
    let total: usize = args.get(5).and_then(|v| v.parse().ok()).unwrap_or(2000);
    let url =
        std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:16379".to_owned());

    let payload = von_probes::payload_json(size);
    let client = redis::Client::open(url.as_str()).unwrap();

    let mut setup = ConnectionManager::new(client.clone()).await.unwrap();
    let sha: String = redis::cmd("SCRIPT")
        .arg("LOAD")
        .arg(RESERVE)
        .query_async(&mut setup)
        .await
        .unwrap();

    let per_conn = (total / conns).max(1);
    let started = Instant::now();
    let mut handles = Vec::new();
    for _ in 0..conns {
        let mut conn = ConnectionManager::new(client.clone()).await.unwrap();
        let payload = payload.clone();
        let sha = sha.clone();
        let mode = mode.clone();
        handles.push(tokio::spawn(async move {
            let mut lat = Vec::new();
            let rounds = (per_conn / depth).max(1);
            for _ in 0..rounds {
                let mut pipe = redis::pipe();
                for _ in 0..depth {
                    if mode == "evalsha" {
                        pipe.cmd("EVALSHA")
                            .arg(&sha)
                            .arg(2)
                            .arg("{probe}:quota")
                            .arg("{probe}:rate")
                            .arg(i64::MAX / 2)
                            .arg(1)
                            .arg(3600)
                            .arg(1)
                            .arg(STREAM)
                            .arg(&payload)
                            .arg(0)
                            .arg(1)
                            .arg(1)
                            .ignore();
                    } else {
                        pipe.cmd("XADD")
                            .arg(STREAM)
                            .arg("MAXLEN")
                            .arg("~")
                            .arg(10000)
                            .arg("*")
                            .arg("data")
                            .arg(&payload)
                            .ignore();
                    }
                }
                let t0 = Instant::now();
                let _: () = pipe.query_async(&mut conn).await.unwrap();
                lat.push(t0.elapsed().as_secs_f64() * 1000.0);
            }
            (lat, rounds * depth)
        }));
    }

    let mut lat = Vec::new();
    let mut ops = 0usize;
    for h in handles {
        let (l, n) = h.await.unwrap();
        lat.extend(l);
        ops += n;
    }
    let wall = started.elapsed().as_secs_f64();
    lat.sort_by(|a, b| a.partial_cmp(b).unwrap());

    let _: redis::RedisResult<()> = redis::cmd("DEL").arg(STREAM).query_async(&mut setup).await;

    println!(
        "{mode:>8}  {:>7} B  conns={conns} depth={depth}  {:>8.0} ops/s  {:>7.1} MB/s  pipeline p50 {:.2}ms p95 {:.2}ms",
        payload.len(),
        ops as f64 / wall,
        mbps(payload.len(), ops, wall),
        pct(&lat, 0.50),
        pct(&lat, 0.95),
    );
}
