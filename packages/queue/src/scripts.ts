import { getRedisClient } from "@/connection";

/**
 * Combined quota reservation + stream buffer write in a single Redis round trip.
 * Returns [allowed (0/1), currentUsage, streamId].
 */
const RESERVE_AND_BUFFER_SCRIPT = `
local quota_key = KEYS[1]
local stream_key = KEYS[2]
local limit = tonumber(ARGV[1])
local requested = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
local has_overage = tonumber(ARGV[4])
local payload = ARGV[5]

local current = tonumber(redis.call('GET', quota_key) or '0')

if has_overage == 0 and current + requested > limit then
  return {0, current, ''}
end

local new_val = redis.call('INCRBY', quota_key, requested)
redis.call('EXPIRE', quota_key, ttl)

local stream_id = redis.call('XADD', stream_key, 'MAXLEN', '~', '10000', '*', 'data', payload)

return {1, new_val, stream_id}
`;

export type ReserveAndBufferResult = {
  allowed: boolean;
  currentUsage: number;
  streamId: string;
};

export async function reserveAndBuffer(params: {
  quotaKey: string;
  streamKey: string;
  limit: number;
  requested: number;
  ttl: number;
  hasOverage: boolean;
  payload: string;
}): Promise<ReserveAndBufferResult> {
  const result = (await getRedisClient().eval(
    RESERVE_AND_BUFFER_SCRIPT,
    2,
    params.quotaKey,
    params.streamKey,
    String(params.limit),
    String(params.requested),
    String(params.ttl),
    params.hasOverage ? "1" : "0",
    params.payload
  )) as [number, number, string];

  return {
    allowed: result[0] === 1,
    currentUsage: result[1],
    streamId: result[2],
  };
}
