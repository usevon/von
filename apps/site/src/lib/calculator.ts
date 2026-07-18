export type PlanId = "free" | "starter" | "growth" | "scale" | "enterprise";

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

export const PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Everything you need to start shipping webhooks.",
    price: 0,
    priceLabel: "$0",
    periodLabel: "/month",
    messages: 50_000,
    messagesLabel: "50,000",
    overageRate: null,
    overageLabel: "Hard cap",
    throughputLabel: "100/sec",
    retentionLabel: "3 days",
    supportLabel: "Discord",
  },
  {
    id: "starter",
    name: "Starter",
    description: "For your first production workloads.",
    price: 29,
    priceLabel: "$29",
    periodLabel: "/month",
    messages: 250_000,
    messagesLabel: "250,000",
    overageRate: 1.0,
    overageLabel: "$1.00 per 10k",
    throughputLabel: "500/sec",
    retentionLabel: "7 days",
    supportLabel: "Email",
  },
  {
    id: "growth",
    name: "Growth",
    description: "For teams shipping at real volume.",
    price: 99,
    priceLabel: "$99",
    periodLabel: "/month",
    messages: 1_000_000,
    messagesLabel: "1,000,000",
    overageRate: 0.5,
    overageLabel: "$0.50 per 10k",
    throughputLabel: "2,000/sec",
    retentionLabel: "14 days",
    supportLabel: "Priority email",
  },
  {
    id: "scale",
    name: "Scale",
    description: "For high volume, latency sensitive delivery.",
    price: 499,
    priceLabel: "$499",
    periodLabel: "/month",
    messages: 10_000_000,
    messagesLabel: "10,000,000",
    overageRate: 0.2,
    overageLabel: "$0.20 per 10k",
    throughputLabel: "10,000/sec",
    retentionLabel: "30 days",
    supportLabel: "Priority email",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom limits, terms, and deployment.",
    price: null,
    priceLabel: "Custom",
    periodLabel: "",
    messages: null,
    messagesLabel: "Custom",
    overageRate: null,
    overageLabel: "Custom",
    throughputLabel: "Custom",
    retentionLabel: "Custom",
    supportLabel: "Dedicated",
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

// Ties resolve to the later plan because higher tiers also raise throughput and retention.
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
