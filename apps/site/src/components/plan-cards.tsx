import Link from "next/link";

import { PLANS, type PricingPlan } from "@/lib/calculator";
import { urls } from "@/lib/urls";

import { type Plan, PlanCard } from "./plan-card";

const overageFeatureLabel = (tier: PricingPlan) => {
  if (tier.id === "free") {
    return "No overage, hard cap";
  }
  if (tier.overageRate === null) {
    return "Custom overage";
  }
  return `Overage at ${tier.overageLabel}`;
};

const plans: Plan[] = PLANS.map((tier) => ({
  name: tier.name,
  price: tier.priceLabel,
  period: tier.periodLabel,
  description: tier.description,
  features: [
    { label: `${tier.messagesLabel} messages/month` },
    { label: `${tier.throughputLabel} throughput` },
    { label: `${tier.retentionLabel} retention` },
    {
      label: overageFeatureLabel(tier),
      excluded: tier.id === "free",
    },
    {
      label: tier.id === "free" ? "1 team member" : "Unlimited team members",
    },
    { label: "Free retries, never counted" },
    { label: `${tier.supportLabel} support` },
  ],
  cta: "Get started",
  href: urls.signup,
  highlighted: tier.id === "growth",
}));

type Props = {
  comparePath?: string;
};

export const PlanCards = (props: Props) => (
  <div className="px-8 sm:px-12">
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 xl:gap-0">
      {plans.map((plan) => (
        <PlanCard
          className={
            plan.highlighted
              ? "shadow-md xl:z-10"
              : "bg-accent/40 shadow-none xl:-mr-px"
          }
          key={plan.name}
          plan={plan}
        />
      ))}
    </div>
    {!!props.comparePath && (
      <div className="mt-4 w-full text-center md:hidden">
        <Link
          className="text-muted-foreground text-sm underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
          href={props.comparePath}
        >
          Compare all features
        </Link>
      </div>
    )}
  </div>
);
