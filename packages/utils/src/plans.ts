export type PlanName = "hobby" | "pro";

export type PlanLimits = {
  monthlyDeliveries: number;
  ratePerSecond: number;
  burstPerSecond: number;
  retentionDays: number;
  hasOverage: boolean;
};

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  hobby: {
    monthlyDeliveries: 25_000,
    ratePerSecond: 25,
    burstPerSecond: 25,
    retentionDays: 3,
    hasOverage: false,
  },
  pro: {
    monthlyDeliveries: 100_000,
    ratePerSecond: 100,
    burstPerSecond: 150,
    retentionDays: 90,
    hasOverage: true,
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  if (plan in PLAN_LIMITS) {
    return PLAN_LIMITS[plan as PlanName];
  }
  return PLAN_LIMITS.hobby;
}
