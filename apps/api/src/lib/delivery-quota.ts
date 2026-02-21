import { getRedisClient } from "@usevon/queue";
import { TooManyRequestsError } from "@usevon/utils";

type PlanLimits = {
  monthlyDeliveries: number;
  hasOverage: boolean;
};

// TODO: metered plan limits will come from the org's subscription record
function getPlanLimits(plan: string): PlanLimits {
  if (plan === "hobby") {
    return { monthlyDeliveries: 25_000, hasOverage: false };
  }
  return { monthlyDeliveries: 25_000, hasOverage: true };
}

export const DELIVERY_TTL = 45 * 86_400; // 45 days

export function getMonthKey(orgId: string): string {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `org:deliveries:${orgId}:${month}`;
}

const RESERVE_QUOTA_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local requested = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
local has_overage = tonumber(ARGV[4])
local current = tonumber(redis.call('GET', key) or '0')

if has_overage == 1 then
  local new_val = redis.call('INCRBY', key, requested)
  redis.call('EXPIRE', key, ttl)
  return {1, new_val}
end

if current + requested > limit then
  return {0, current}
end

local new_val = redis.call('INCRBY', key, requested)
redis.call('EXPIRE', key, ttl)
return {1, new_val}
`;

const RELEASE_QUOTA_SCRIPT = `
local key = KEYS[1]
local released = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

if released <= 0 then
  return tonumber(redis.call('GET', key) or '0')
end

local current = tonumber(redis.call('GET', key) or '0')
local next_val = current - released
if next_val < 0 then
  next_val = 0
end

redis.call('SET', key, next_val)
if ttl > 0 then
  redis.call('EXPIRE', key, ttl)
end

return next_val
`;

export async function reserveMonthlyQuota(
  orgId: string,
  plan: string,
  requestedCount: number
): Promise<{ allowed: boolean; currentUsage: number }> {
  if (requestedCount <= 0) {
    return { allowed: true, currentUsage: 0 };
  }

  const limits = getPlanLimits(plan);
  const monthKey = getMonthKey(orgId);

  const result = (await getRedisClient().eval(
    RESERVE_QUOTA_SCRIPT,
    1,
    monthKey,
    String(limits.monthlyDeliveries),
    String(requestedCount),
    String(DELIVERY_TTL),
    limits.hasOverage ? "1" : "0"
  )) as [number, number];

  const allowed = result[0] === 1;
  const currentUsage = result[1];

  if (!allowed) {
    throw new TooManyRequestsError();
  }

  return { allowed, currentUsage };
}

export async function releaseMonthlyQuota(
  orgId: string,
  releasedCount: number
): Promise<{ currentUsage: number }> {
  if (releasedCount <= 0) {
    return { currentUsage: 0 };
  }

  const monthKey = getMonthKey(orgId);

  const currentUsage = (await getRedisClient().eval(
    RELEASE_QUOTA_SCRIPT,
    1,
    monthKey,
    String(releasedCount),
    String(DELIVERY_TTL)
  )) as number;

  return { currentUsage };
}

export async function withReservedMonthlyQuota<T>(
  orgId: string,
  plan: string,
  requestedCount: number,
  run: () => Promise<T>
): Promise<T> {
  await reserveMonthlyQuota(orgId, plan, requestedCount);

  try {
    return await run();
  } catch (error) {
    await releaseMonthlyQuota(orgId, requestedCount);
    throw error;
  }
}
