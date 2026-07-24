# Floor probe results

Measured 2026-07-24 on the dev machine, Windows 11, client and server sharing cores, Redis 7 in Docker Desktop behind the port proxy. Absolute numbers move with hardware, the ratios are what matter.

## copy_floor, serialize and compression (per core, 1MB coalesced entries, distinct payloads per event)

| shape | zstd-1 ratio | zstd-1 enc/dec MB/s | lz4 ratio | lz4 enc/dec MB/s |
| --- | --- | --- | --- | --- |
| 1KB x 100 events | 6.7x | 136 / 508 | 3.1x | 212 / 692 |
| 16KB x 60 events | 7.5x | 223 / 322 | 3.7x | 374 / 1253 |
| 64KB x 15 events | 7.6x | 220 / 326 | 3.7x | 348 / 1740 |
| 256KB x 3 events | 7.6x | 237 / 465 | 3.7x | 676 / 2531 |

Serialize alone runs 0.8 to 1.9 GB/s, not a bottleneck. zstd-1 wins on ratio at acceptable speed, and encode parallelizes across the in-flight pipeline tasks.

## redis_floor, raw write ceiling (no HTTP)

| probe | ops/s | MB/s |
| --- | --- | --- |
| XADD 64KB, 1 conn, depth 16 | 1,470 | 92 |
| XADD 64KB, 4 conns, depth 16 | 2,172 | 136 |
| XADD 64KB, 8 conns, depth 16 | 2,100 | 131 |
| EVALSHA 64KB, 4 conns, depth 16 | 2,008 | 126 |
| XADD 1MB, 4 conns, depth 8 | 146 | 146 |
| EVALSHA 1MB, 4 conns, depth 8 | 115 | 115 |
| EVALSHA tiny, 4 conns, depth 64 | 41,228 | 5 |

The transport saturates near 135 to 146 MB/s regardless of connection count, so the Docker proxy plus loopback is the wall, not Redis CPU and not connection parallelism past 4. The Lua ARGV tax is 8% at 64KB and 21% at 1MB, real but small next to compression. Tiny ops reach 41k EVALSHA/s, far above what coalesced ingest ever issues.

## http_floor, HTTP plus serde ceiling (no Redis)

| payload | req/s | MB/s |
| --- | --- | --- |
| tiny | 37,721 | - |
| 16KB | 30,471 | 476 |
| 64KB | 12,032 | 752 |
| 256KB | 5,294 | 1,323 |

HTTP and body parsing are nowhere near the wall for large payloads.

## e2e_floor, from-scratch minimal ingest (HTTP to durable XADD, no auth, no quota, no coalescing)

| payload | req/s | MB/s | current von-ingest |
| --- | --- | --- | --- |
| tiny | 15,119 | - | 12,500 to 26,000 |
| 16KB | 4,503 | 70 | ~2,700 / 43 |
| 64KB | 1,466 | 92 | 1,143 to 1,333 / 71 to 83 |
| 256KB | 436 | 109 | ~390 / 97 |

## Verdict on the rewrite hypothesis

A from-scratch ingest is at most 1.1x to 1.3x faster at large payloads, because both designs hit the same Redis transport wall, and at tiny payloads the current per-tenant coalescing actually beats the naive one-XADD-per-event design. A rewrite is not justified. The wall moves only by shrinking bytes, which is what zstd-1 entry compression does (7.5x), with the Lua tax shrinking proportionally. After compression the effective payload ceiling is bounded by zstd encode throughput times in-flight pipeline parallelism, roughly 220 MB/s per core, well above the current 100 MB/s.
