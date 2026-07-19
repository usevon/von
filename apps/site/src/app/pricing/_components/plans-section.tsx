"use client";

import { CheckIcon, MinusIcon, QuestionMarkIcon } from "@phosphor-icons/react";
import { Popover, PopoverPopup, PopoverTrigger } from "@usevon/ui";

// Type only, and the plans arrive as a prop, because calculator reads
// autumn.config which pulls in atmn, and atmn is node only so anything reaching
// it cannot be bundled into a client component.
import type { PricingPlan } from "@/lib/calculator";

type ComparisonValue = boolean | string;

type ComparisonGroup = {
  category: string;
  features: {
    name: string;
    description: string;
    valueFor: (plan: PricingPlan) => ComparisonValue;
  }[];
};

const comparisonGroups: ComparisonGroup[] = [
  {
    category: "Usage",
    features: [
      {
        name: "Messages",
        description: "Messages included each month before any overage.",
        valueFor: (plan) => plan.messagesLabel,
      },
      {
        name: "Overage",
        description:
          "Price for messages beyond the included amount. Free has a hard cap instead.",
        valueFor: (plan) => plan.overageLabel,
      },
      {
        name: "Throughput",
        description: "Sustained messages delivered per second.",
        valueFor: (plan) => plan.throughputLabel,
      },
      {
        name: "Retention",
        description: "How far back you can inspect delivery history.",
        valueFor: (plan) => plan.retentionLabel,
      },
    ],
  },
  {
    category: "Platform",
    features: [
      {
        name: "Team members",
        description: "Users with access to your workspace.",
        valueFor: (plan) => (plan.id === "free" ? "1" : "Unlimited"),
      },
      {
        name: "Dev tunnels",
        description:
          "Run local tunnels to receive webhooks during development.",
        valueFor: (plan) => (plan.id === "free" ? "up to 3" : "Unlimited"),
      },
      {
        name: "Free retries",
        description: "Retried deliveries are never counted against your usage.",
        valueFor: () => true,
      },
      {
        name: "Support",
        description: "How you reach us when something goes wrong.",
        valueFor: (plan) => plan.supportLabel,
      },
    ],
  },
];

const renderValue = (value: ComparisonValue) => {
  if (value === true) {
    return (
      <CheckIcon className="mx-auto size-4 text-foreground" weight="bold" />
    );
  }
  if (value === false) {
    return <MinusIcon className="mx-auto size-4 text-muted-foreground/30" />;
  }
  return value;
};

type ComparisonTooltipProps = {
  name: string;
  description: string;
};

const ComparisonTooltip = (props: ComparisonTooltipProps) => (
  <span className="inline-flex items-center gap-2">
    {props.name}
    <Popover>
      <PopoverTrigger
        className="inline-flex size-4 cursor-help items-center justify-center border border-border text-muted-foreground/60 outline-none transition-colors hover:text-muted-foreground"
        delay={200}
        openOnHover
      >
        <QuestionMarkIcon size={8} weight="bold" />
      </PopoverTrigger>
      <PopoverPopup className="max-w-56" sideOffset={8} tooltipStyle>
        {props.description}
      </PopoverPopup>
    </Popover>
  </span>
);

const GRID = "grid grid-cols-[1.4fr_repeat(5,1fr)]";

const ComparisonTable = (props: { plans: PricingPlan[] }) => (
  <section className="mt-16 border-border border-b max-lg:hidden">
    <div
      className={`${GRID} sticky top-16 z-10 -mb-px h-[53px] border-border border-y bg-background/80 backdrop-blur-lg`}
    >
      <div />
      {props.plans.map((plan) => (
        <div
          className="flex items-center border-border border-l px-6"
          key={plan.id}
        >
          <span className="font-semibold text-sm">{plan.name}</span>
        </div>
      ))}
    </div>
    {comparisonGroups.map((group) => (
      <div key={group.category}>
        <div className="border-border border-t bg-accent/30 px-8 py-4">
          <span className="font-medium text-sm">{group.category}</span>
        </div>
        {group.features.map((feature) => (
          <div
            className={`${GRID} border-border/50 border-t text-sm`}
            key={feature.name}
          >
            <div className="flex items-center px-8 py-4 text-muted-foreground">
              <ComparisonTooltip
                description={feature.description}
                name={feature.name}
              />
            </div>
            {props.plans.map((plan) => (
              <div
                className="flex items-center justify-center border-border/50 border-l px-4 py-4 text-center text-muted-foreground"
                key={plan.id}
              >
                {renderValue(feature.valueFor(plan))}
              </div>
            ))}
          </div>
        ))}
      </div>
    ))}
  </section>
);

export const PlansSection = (props: { plans: PricingPlan[] }) => (
  <ComparisonTable plans={props.plans} />
);
