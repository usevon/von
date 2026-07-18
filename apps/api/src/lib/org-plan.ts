import { db, eq } from "@usevon/db";
import { organization } from "@usevon/db/schema";
import { getRedisClient } from "@usevon/queue";
import { Elysia } from "elysia";
import { MemoCache } from "@/lib/memo-cache";

const CACHE_TTL = 300;
const CACHE_PREFIX = "org:plan:";

// Plan changes propagate to other instances within this TTL after the Redis key is invalidated.
const localPlanCache = new MemoCache<string>(15_000);

export async function getOrgPlan(organizationId: string): Promise<string> {
  const local = localPlanCache.get(organizationId);
  if (local) {
    return local;
  }

  const redis = getRedisClient();
  const cached = await redis.get(`${CACHE_PREFIX}${organizationId}`);
  if (cached) {
    localPlanCache.set(organizationId, cached);
    return cached;
  }

  const [org] = await db
    .select({ plan: organization.plan })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  const plan = org?.plan ?? "hobby";
  localPlanCache.set(organizationId, plan);
  await redis.setex(`${CACHE_PREFIX}${organizationId}`, CACHE_TTL, plan);
  return plan;
}

export async function invalidateOrgPlanCache(
  organizationId: string
): Promise<void> {
  localPlanCache.delete(organizationId);
  await getRedisClient().del(`${CACHE_PREFIX}${organizationId}`);
}

export const resolveOrgPlan = new Elysia({ name: "org-plan" }).resolve(
  { as: "scoped" },
  async ({
    organizationId,
  }: {
    organizationId: string;
  }) => ({
    plan: await getOrgPlan(organizationId),
  })
);
