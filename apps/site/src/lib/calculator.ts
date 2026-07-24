// Prices and included volumes come from autumn.config.ts so billing and the site
// can never disagree, everything else here is presentation.
import type { Plan } from "atmn";
import {
  free as autumnFree,
  growth as autumnGrowth,
  scale as autumnScale,
  starter as autumnStarter,
} from "../../autumn.config";

export type PlanId = "free" | "starter" | "growth" | "scale";

const amountOf = (plan: Plan): number => plan.price?.amount ?? 0;

const includedOf = (plan: Plan): number => {
  const included = plan.items?.find((i) => typeof i.included === "number");
  return typeof included?.included === "number" ? included.included : 0;
};

const overageOf = (plan: Plan): number | null =>
  plan.items?.find((i) => i.price !== undefined)?.price?.amount ?? null;

export type PricingPlan = {
  id: PlanId;
  name: string;
  description: string;
  price: number | null;
  priceLabel: string;
  periodLabel: string;
  messages: number | null;
  messagesLabel: string;
  overageRate: number | null;
  overageLabel: string;
  throughputLabel: string;
  retentionLabel: string;
  supportLabel: string;
};

export const OVERAGE_BLOCK = 10_000;

export const PAYLOAD_BLOCK_KB = 64;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const count = new Intl.NumberFormat("en-US");

const overageLabel = (rate: number | null) =>
  rate === null ? "Hard cap" : `${money.format(rate)} per 10k`;

export const PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Everything you need to start shipping webhooks.",
    price: amountOf(autumnFree),
    priceLabel: "$0",
    periodLabel: "/month",
    messages: includedOf(autumnFree),
    messagesLabel: count.format(includedOf(autumnFree)),
    overageRate: overageOf(autumnFree),
    overageLabel: overageLabel(overageOf(autumnFree)),
    throughputLabel: "200/sec",
    retentionLabel: "30 days",
    supportLabel: "Discord",
  },
  {
    id: "starter",
    name: "Starter",
    description: "For your first production workloads.",
    price: amountOf(autumnStarter),
    priceLabel: `$${amountOf(autumnStarter)}`,
    periodLabel: "/month",
    messages: includedOf(autumnStarter),
    messagesLabel: count.format(includedOf(autumnStarter)),
    overageRate: overageOf(autumnStarter),
    overageLabel: overageLabel(overageOf(autumnStarter)),
    throughputLabel: "500/sec",
    retentionLabel: "30 days",
    supportLabel: "Email",
  },
  {
    id: "growth",
    name: "Growth",
    description: "For teams shipping at real volume.",
    price: amountOf(autumnGrowth),
    priceLabel: `$${amountOf(autumnGrowth)}`,
    periodLabel: "/month",
    messages: includedOf(autumnGrowth),
    messagesLabel: count.format(includedOf(autumnGrowth)),
    overageRate: overageOf(autumnGrowth),
    overageLabel: overageLabel(overageOf(autumnGrowth)),
    throughputLabel: "1,000/sec",
    retentionLabel: "30 days",
    supportLabel: "Priority email",
  },
  {
    id: "scale",
    name: "Scale",
    description: "For high volume, latency sensitive delivery.",
    price: amountOf(autumnScale),
    priceLabel: `$${amountOf(autumnScale)}`,
    periodLabel: "/month",
    messages: includedOf(autumnScale),
    messagesLabel: count.format(includedOf(autumnScale)),
    overageRate: overageOf(autumnScale),
    overageLabel: overageLabel(overageOf(autumnScale)),
    throughputLabel: "2,500/sec",
    retentionLabel: "30 days",
    supportLabel: "Priority email",
  },
];

export const BILLABLE_PLANS = PLANS.filter((plan) => plan.price !== null);

export const fmt = new Intl.NumberFormat("en-US");

export const fmtCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function roundMoney(v: number) {
  return Math.round(v * 100) / 100;
}

export function getPlanCost(
  plan: PricingPlan,
  messages: number
): number | null {
  if (plan.price === null || plan.messages === null) {
    return null;
  }
  const extra = Math.max(0, messages - plan.messages);
  if (extra === 0) {
    return plan.price;
  }
  if (plan.overageRate === null) {
    return null;
  }
  return roundMoney(plan.price + (extra / OVERAGE_BLOCK) * plan.overageRate);
}

export type PlanEstimate = {
  plan: PricingPlan;
  total: number;
  overage: number;
};

// Ties resolve to the later plan because higher tiers also raise throughput.
export function getCheapestPlan(messages: number): PlanEstimate {
  let best: PlanEstimate | null = null;

  for (const plan of BILLABLE_PLANS) {
    const total = getPlanCost(plan, messages);
    if (total === null) {
      continue;
    }
    if (!best || total <= best.total) {
      best = {
        plan,
        total,
        overage: roundMoney(total - (plan.price ?? 0)),
      };
    }
  }

  if (!best) {
    const fallback = BILLABLE_PLANS.at(-1) as PricingPlan;
    return { plan: fallback, total: fallback.price ?? 0, overage: 0 };
  }

  return best;
}
