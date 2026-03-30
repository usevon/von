import { getRedisClient } from "@/connection";

type PlanLimits = {
  ratePerSecond: number;
  burstPerSecond: number;
};

export function getPlanLimits(plan: string): PlanLimits {
  if (plan === "hobby") {
    return { ratePerSecond: 25, burstPerSecond: 35 };
  }
  return { ratePerSecond: 100, burstPerSecond: 140 };
}

const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local rate = tonumber(ARGV[1])
local burst = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(data[1])
local last_refill = tonumber(data[2])

if tokens == nil then
  tokens = burst
  last_refill = now
end

local elapsed = math.max(0, now - last_refill)
tokens = math.min(burst, tokens + elapsed * rate)
last_refill = now

if tokens >= requested then
  tokens = tokens - requested
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', last_refill)
  redis.call('EXPIRE', key, 60)
  return {1, math.floor(tokens)}
end

redis.call('HMSET', key, 'tokens', tokens, 'last_refill', last_refill)
redis.call('EXPIRE', key, 60)
return {0, math.floor(tokens)}
`;

export async function checkThroughputLimit(
  orgId: string,
  plan: string,
  requestedTokens: number
): Promise<{ allowed: boolean; remaining: number }> {
  const limits = getPlanLimits(plan);
  const key = `org:throughput:${orgId}`;
  const now = Date.now() / 1000;

  const result = (await getRedisClient().eval(
    TOKEN_BUCKET_SCRIPT,
    1,
    key,
    String(limits.ratePerSecond),
    String(limits.burstPerSecond),
    String(now),
    String(requestedTokens)
  )) as [number, number];

  return {
    allowed: result[0] === 1,
    remaining: result[1],
  };
}
