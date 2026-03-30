"use client";

import { CheckIcon, MinusIcon, QuestionMarkIcon } from "@phosphor-icons/react";
import { Popover, PopoverPopup, PopoverTrigger } from "@usevon/ui";

import { PlanCards } from "@/components/plan-cards";
import {
  fmt,
  fmtCurrency,
  INCLUDED_TEAM_MEMBERS,
  RATE_TIERS,
} from "@/lib/calculator";
import {
  useCalculatorState,
} from "./use-calculator-state";

type ComparisonValue = boolean | string;

type ComparisonGroup = {
  category: string;
  features: {
    name: string;
    description: string;
    hobby: ComparisonValue;
    payg: ComparisonValue;
  }[];
};

function renderValue(v: ComparisonValue) {
  if (v === true) {
    return (
      <CheckIcon className="mx-auto size-4 text-foreground" weight="bold" />
    );
  }
  if (v === false) {
    return <MinusIcon className="mx-auto size-4 text-muted-foreground/30" />;
  }
  return v;
}

function ComparisonTooltip({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      {name}
      <Popover>
        <PopoverTrigger
          className="inline-flex size-4 cursor-help items-center justify-center border border-border text-muted-foreground/60 outline-none transition-colors hover:text-muted-foreground"
          delay={200}
          openOnHover
        >
          <QuestionMarkIcon size={8} weight="bold" />
        </PopoverTrigger>
        <PopoverPopup className="max-w-56" sideOffset={8} tooltipStyle>
          {description}
        </PopoverPopup>
      </Popover>
    </span>
  );
}

function ComparisonTable({ groups }: { groups: ComparisonGroup[] }) {
  return (
    <section className="mt-8 border-border border-b max-sm:hidden">
      <div className="sticky top-16 z-10 -mb-px grid h-[53px] grid-cols-3 border-border border-y bg-background/80 backdrop-blur-lg">
        <div />
        <div className="flex items-center border-border border-l px-8">
          <span className="font-semibold text-sm">Hobby</span>
        </div>
        <div className="flex items-center border-border border-l px-8">
          <span className="font-semibold text-sm">Metered</span>
        </div>
      </div>
      {groups.map((group) => (
        <div key={group.category}>
          <div className="border-border border-t bg-accent/30 px-8 py-4">
            <span className="font-medium text-sm">{group.category}</span>
          </div>
          {group.features.map((feature) => (
            <div
              className="grid grid-cols-3 border-border/50 border-t text-sm"
              key={feature.name}
            >
              <div className="flex items-center px-8 py-4 text-muted-foreground">
                <ComparisonTooltip
                  description={feature.description}
                  name={feature.name}
                />
              </div>
              <div className="flex items-center justify-center border-border/50 border-l px-4 py-4 text-center text-muted-foreground">
                {renderValue(feature.hobby)}
              </div>
              <div className="flex items-center justify-center border-border/50 border-l px-4 py-4 text-center text-muted-foreground">
                {renderValue(feature.payg)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

export function PlansSection() {
  const calc = useCalculatorState();

  const activeMembers = calc.teamMembersEnabled
    ? calc.teamMembers
    : INCLUDED_TEAM_MEMBERS;

  const comparisonGroups: ComparisonGroup[] = [
    {
      category: "Usage",
      features: [
        {
          name: "Webhooks/month",
          description: "Total webhook deliveries included each month.",
          hobby: "25,000",
          payg: fmt.format(calc.monthlyWebhooks),
        },
        {
          name: "Additional webhooks",
          description:
            "Graduated per-10k rate for usage beyond the included amount.",
          hobby: false,
          payg: `from ${fmtCurrency.format(RATE_TIERS[0].rate)} per 10k`,
        },
        {
          name: "Throughput",
          description:
            "Sustained webhooks delivered per second under normal load.",
          hobby: "25/sec",
          payg: calc.throughputEnabled
            ? `${calc.throughputPerSecond}/sec`
            : "25/sec",
        },
        {
          name: "Burst capacity",
          description:
            "Short-term headroom above base throughput (1.4x) to absorb spikes.",
          hobby: `${Math.floor(25 * 1.4)}/sec`,
          payg: `${calc.burstCapacity}/sec`,
        },
      ],
    },
    {
      category: "Infrastructure",
      features: [
        {
          name: "Retention",
          description: "How far back you can inspect delivery history.",
          hobby: "3 days",
          payg: calc.retentionEnabled ? `${calc.retentionDays} days` : "7 days",
        },
        {
          name: "Team members",
          description:
            "Users with access to your workspace. Each member can run up to 3 dev tunnels.",
          hobby: "1",
          payg: `${activeMembers}`,
        },
        {
          name: "Dev tunnels",
          description:
            "Run local tunnels to receive webhooks during development. Up to 3 per member.",
          hobby: "up to 3",
          payg: `up to ${activeMembers * 3}`,
        },
        {
          name: "Custom domains",
          description: "Use your own domain for webhook endpoints.",
          hobby: false,
          payg: calc.customDomainsEnabled
            ? `${fmtCurrency.format(5)}/mo`
            : `+${fmtCurrency.format(5)}/mo`,
        },
      ],
    },
    {
      category: "Billing",
      features: [
        {
          name: "Base price",
          description: "Minimum monthly charge.",
          hobby: "$0",
          payg: `${fmtCurrency.format(5)}/mo`,
        },
        {
          name: "Estimated total",
          description: "Based on current calculator settings.",
          hobby: "$0",
          payg: fmtCurrency.format(calc.billedTotal),
        },
      ],
    },
  ];

  return (
    <>
      <div className="mt-4">
        <PlanCards calc={calc} />
      </div>
      <ComparisonTable groups={comparisonGroups} />
    </>
  );
}
