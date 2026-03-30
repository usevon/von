import { db, eq } from "@usevon/db";
import { organization } from "@usevon/db/schema";
import { getRedisClient } from "@usevon/queue";
import { Elysia } from "elysia";

const redis = getRedisClient();
const CACHE_TTL = 300;
const CACHE_PREFIX = "org:plan:";

export async function getOrgPlan(organizationId: string): Promise<string> {
  const cached = await redis.get(`${CACHE_PREFIX}${organizationId}`);
  if (cached) {
    return cached;
  }

  const [org] = await db
    .select({ plan: organization.plan })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  const plan = org?.plan ?? "hobby";
  await redis.setex(`${CACHE_PREFIX}${organizationId}`, CACHE_TTL, plan);
  return plan;
}

export async function invalidateOrgPlanCache(
  organizationId: string
): Promise<void> {
  await redis.del(`${CACHE_PREFIX}${organizationId}`);
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
