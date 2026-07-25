# Floor probe results

Measured 2026-07-24 on the dev machine, Windows 11, client and server sharing cores, Redis 7 in Docker Desktop behind the port proxy. Absolute numbers move with hardware, the ratios are what matter. A same-day Linux rerun lives at the bottom and supersedes the transport conclusions here.

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

# Linux rerun, same day, same machine

Measured 2026-07-24 inside WSL2 Ubuntu 24.04 on the same hardware, 16 cores, Redis 7.0.15 running natively in the distro with persistence off, no Docker proxy and no Windows loopback relay anywhere in the path. Client and server still share cores. WSL2 is not bare metal but it removes exactly the relay the Windows numbers were suspected of measuring.

## copy_floor on Linux (zstd-3 also probed, ratios unchanged)

| shape | zstd-1 ratio | zstd-1 enc/dec MB/s | lz4 ratio | lz4 enc/dec MB/s |
| --- | --- | --- | --- | --- |
| 1KB x 100 events | 6.7x | 501 / 1793 | 3.1x | 846 / 3451 |
| 16KB x 60 events | 7.5x | 590 / 1327 | 3.7x | 803 / 2698 |
| 64KB x 15 events | 7.6x | 600 / 1354 | 3.7x | 748 / 2577 |
| 256KB x 3 events | 7.6x | 540 / 1763 | 3.7x | 679 / 2776 |

Same ratios, but encode runs 2.5x to 3.7x faster than the Windows measurement of the identical code, so the per-core zstd-1 budget is roughly 600 MB/s, not 220. Serialize alone reached 2.4 to 29 GB/s.

## redis_floor on Linux

| probe | ops/s | MB/s | Windows MB/s |
| --- | --- | --- | --- |
| XADD 64KB, 1 conn, depth 16 | 5,609 | 351 | 92 |
| XADD 64KB, 4 conns, depth 16 | 13,448 | 841 | 136 |
| XADD 64KB, 8 conns, depth 16 | 12,818 | 801 | 131 |
| EVALSHA 64KB, 4 conns, depth 16 | 6,358 | 398 | 126 |
| XADD 1MB, 4 conns, depth 8 | 756 | 756 | 146 |
| EVALSHA 1MB, 4 conns, depth 8 | 321 | 321 | 115 |
| EVALSHA tiny, 4 conns, depth 64 | 88,264 | 1 | 5 |

The Windows transport wall was the relay, full stop. Native transport peaks near 840 MB/s at 4 connections, 5.8x the Windows ceiling, and connection scaling is real again (1 to 4 conns is 2.4x, 8 conns adds nothing). The bigger reversal is the Lua ARGV tax. On Windows it looked like 8 to 21% because the relay hid Redis CPU. On Linux EVALSHA costs 53% of XADD throughput at 64KB and 58% at 1MB, because copying the payload through ARGV is now the dominant Redis-side cost. The tiny-op ceiling doubled to 88k EVALSHA/s.

## http_floor on Linux (peak median across concurrency levels, 3 passes)

| payload | req/s | MB/s | Windows req/s |
| --- | --- | --- | --- |
| tiny | 76,885 | - | 37,721 |
| 16KB | 39,163 | 612 | 30,471 |
| 64KB | 18,908 | 1,182 | 12,032 |
| 256KB | 5,762 | 1,441 | 5,294 |
| 1MB | 1,242 | 1,242 | - |

## e2e_floor on Linux (peak median across concurrency levels, 3 passes)

| payload | req/s | MB/s | Windows req/s |
| --- | --- | --- | --- |
| tiny | 76,130 | - | 15,119 |
| 16KB | 12,726 | 199 | 4,503 |
| 64KB | 8,923 | 558 | 1,466 |
| 256KB | 3,377 | 844 | 436 |
| 1MB | 506 | 506 | - |

## What changes in the verdict

The rewrite verdict stands, both designs still share the same wall and coalescing still wins at tiny payloads. Three things move. First, every Windows absolute is an artifact, the honest floor is 5x to 6x higher across the board, so the production sizing story should quote the Linux table. Second, the Lua ARGV tax is no longer minor, at large payloads the reserve script forfeits roughly half the available Redis throughput, so splitting the quota decision from the XADD (quota in Lua, XADD pipelined outside) is now a first-class lever alongside compression rather than a rounding error. Third, compression gets cheaper exactly when the transport gets faster, 600 MB/s per-core encode against a 840 MB/s transport means one encoding core roughly saturates the pipe, which strengthens the zstd-1 decision. The current von-ingest comparison column was not rerun here, that requires the full stack on Linux and belongs with the delivery-path benchmark.
