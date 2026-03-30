"use client";

import Link from "next/link";

import { CalculatorDialog } from "@/app/pricing/_components/calculator-panel";
import {
  type CalculatorState,
  useCalculatorState,
} from "@/app/pricing/_components/use-calculator-state";
import { INCLUDED_TEAM_MEMBERS } from "@/lib/calculator";
import { urls } from "@/lib/urls";

import { type Plan, PlanCard } from "./plan-card";

const hobbyPlan: Plan = {
  name: "Hobby",
  price: "$0",
  period: "/month",
  description: "Everything you need to start shipping webhooks.",
  features: [
    { label: "25,000 webhooks/month" },
    { label: "25/sec throughput" },
    { label: "3 day retention" },
    { label: "1 team member, up to 3 tunnels" },
    { label: "Custom domains", excluded: true },
    { label: "Discord support" },
  ],
  cta: "Get started",
  href: urls.signup,
  highlighted: false,
};

export function PlanCards({
  comparePath,
  calc: externalCalc,
}: {
  comparePath?: string;
  calc?: CalculatorState;
}) {
  const internalCalc = useCalculatorState();
  const calc = externalCalc ?? internalCalc;

  const activeMembers = calc.teamMembersEnabled
    ? calc.teamMembers
    : INCLUDED_TEAM_MEMBERS;
  const plural = (n: number, word: string) =>
    `${n} ${word}${n !== 1 ? "s" : ""}`;

  const meteredPlan: Plan = {
    name: "Metered",
    price: "$5",
    period: "/month + usage",
    description: "Only pay for what you process.",
    features: [
      { label: "Unlimited webhooks" },
      {
        label: `${calc.throughputEnabled ? calc.throughputPerSecond : 25}/sec throughput`,
      },
      {
        label: `${calc.retentionEnabled ? calc.retentionDays : 7} days retention`,
      },
      {
        label: `${plural(activeMembers, "team member")}, up to ${activeMembers * 3} tunnels`,
      },
      { label: "Custom domains" },
      { label: "Discord support" },
    ],
    cta: "Get started",
    href: urls.signup,
    highlighted: true,
  };

  return (
    <div className="flex w-full flex-col gap-4 px-8 sm:px-12 md:flex-row md:items-center md:justify-center md:gap-0">
      <PlanCard
        className="w-full bg-accent/40 shadow-none md:w-96 md:border-r-0"
        plan={hobbyPlan}
      />
      <PlanCard className="w-full shadow-md md:w-96" plan={meteredPlan}>
        <CalculatorDialog state={calc} />
      </PlanCard>
      {!!comparePath && (
        <div className="mt-4 w-full text-center md:hidden">
          <Link
            className="text-muted-foreground text-sm underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
            href={comparePath}
          >
            Compare all features
          </Link>
        </div>
      )}
    </div>
  );
}
