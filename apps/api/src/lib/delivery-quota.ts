import { getRedisClient } from "@usevon/queue";
import { getPlanLimits, TooManyRequestsError } from "@usevon/utils";

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
    throw new TooManyRequestsError("Monthly delivery quota exceeded");
  }

  return { allowed, currentUsage };
}
