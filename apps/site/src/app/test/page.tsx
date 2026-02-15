"use client";

import {
  CheckCircleIcon,
  CheckIcon,

  MinusIcon,
  QuestionMarkIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import {
  Button,
  Popover,
  PopoverTrigger,
  PopoverPopup,
  Separator,
} from "@usevon/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { urls } from "@/lib/urls";

/* ------------------------------------------------------------------ */
/* Shared data                                                         */
/* ------------------------------------------------------------------ */

type Feature = {
  label: ReactNode;
  tooltip?: string;
  excluded?: boolean;
};

const plans = [
  {
    name: "Hobby",
    price: "$0",
    period: "/month",
    description: "Everything you need to start shipping webhooks.",
    features: [
      {
        label: (
          <span>
            25,000 webhooks/month{" "}
            <span className="text-muted-foreground/60">free forever</span>
          </span>
        ),
        tooltip:
          "Includes both inbound and outbound webhooks, retries are free.",
      },
      {
        label: "25/sec throughput",
        tooltip:
          "The sustained number of webhooks Von can deliver per second on your plan.",
      },
      {
        label: "3 day retention",
        tooltip: "How long delivery logs and history are stored.",
      },
      {
        label: "1 team member",
        tooltip: "Additional members available on Pro.",
      },
      {
        label: "Custom domains",
        excluded: true,
        tooltip:
          "Deliver webhooks from your own domain instead of api.usevon.com.",
      },
      { label: "Discord support" },
    ] as Feature[],
    cta: "Get Started",
    href: urls.signup,
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$20",
    period: "/month + usage",
    description: "For teams that need scale, reliability, and control.",
    features: [
      {
        label: (
          <span>
            100,000 webhooks/month{" "}
            <span className="text-muted-foreground/60">then $1 per 10k</span>
          </span>
        ),
        tooltip:
          "Includes both inbound and outbound webhooks, retries are free.",
      },
      {
        label: (
          <span>
            100/sec throughput{" "}
            <span className="text-muted-foreground/60">with burst</span>
          </span>
        ),
        tooltip:
          "Sustained 100 webhooks/sec with burst up to 150/sec during traffic spikes.",
      },
      {
        label: "90 day retention",
        tooltip:
          "How long delivery logs and history are stored, extendable up to 1 year.",
      },
      {
        label: "5 team members",
        tooltip: "Additional members can be purchased from the dashboard.",
      },
      {
        label: "Custom domains",
        tooltip:
          "Deliver webhooks from your own domain instead of api.usevon.com.",
      },
      { label: "Discord + Email support" },
    ] as Feature[],
    cta: "Get Started",
    href: urls.signupPro,
    highlighted: true,
  },
];

const comparisonFeatures = [
  {
    category: "Usage",
    features: [
      {
        name: "Webhooks/month",
        description:
          "Number of webhook deliveries included in your plan each month.",
        hobby: "25,000",
        pro: "100,000 included",
      },
      {
        name: "Additional webhooks",
        description: "Cost for webhooks beyond your included amount.",
        hobby: false as boolean | string,
        pro: "$1 per 10k" as boolean | string,
      },
      {
        name: "Base throughput",
        description: "Maximum webhooks delivered per second under normal load.",
        hobby: "25/sec",
        pro: "100/sec",
      },
      {
        name: "Burst capacity",
        description: "Temporary throughput boost (1.5x) for traffic spikes.",
        hobby: false as boolean | string,
        pro: "150/sec" as boolean | string,
      },
    ],
  },
  {
    category: "Infrastructure",
    features: [
      {
        name: "Dev tunnels",
        description: "One concurrent tunnel per team member.",
        hobby: "1",
        pro: "1 per member",
      },
      {
        name: "Retention",
        description: "How long webhook delivery logs are stored.",
        hobby: "3 days",
        pro: "90 days",
      },
      {
        name: "Custom domains",
        description: "Use your own domain for webhook endpoints.",
        hobby: false as boolean | string,
        pro: true as boolean | string,
      },
      {
        name: "Dedicated IP",
        description: "Static IP address for customer IP allowlists.",
        hobby: false as boolean | string,
        pro: "+$50/mo per IP" as boolean | string,
      },
    ],
  },
  {
    category: "Team & Support",
    features: [
      {
        name: "Team members",
        description: "Users who can access your Von workspace.",
        hobby: "1",
        pro: "5 included",
      },
      {
        name: "Additional members",
        description: "Cost for each team member beyond the included amount.",
        hobby: false as boolean | string,
        pro: "$5/mo each" as boolean | string,
      },
      {
        name: "Support",
        description: "How you can reach us for help.",
        hobby: "Discord",
        pro: "Discord + Email",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function FeatureItem({ feature }: { feature: Feature }) {
  return (
    <li className="flex items-center gap-3">
      {feature.excluded ? (
        <XCircleIcon
          className="size-4 shrink-0 text-muted-foreground/40"
          weight="fill"
        />
      ) : (
        <CheckCircleIcon className="size-4 shrink-0" weight="fill" />
      )}
      <span
        className={`flex items-center gap-1.5 ${feature.excluded ? "text-muted-foreground/40" : "text-muted-foreground"}`}
      >
        {feature.label}
        {feature.tooltip && (
          <Popover>
            <PopoverTrigger
              openOnHover
              delay={200}
              className="inline-flex cursor-help items-center justify-center size-4 border border-border text-muted-foreground/60 outline-none transition-colors hover:text-muted-foreground"
            >
              <QuestionMarkIcon size={8} weight="bold" />
            </PopoverTrigger>
            <PopoverPopup tooltipStyle sideOffset={8} className="max-w-56">
              {feature.tooltip}
            </PopoverPopup>
          </Popover>
        )}
      </span>
    </li>
  );
}

function FeatureTooltip({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {name}
      <Popover>
        <PopoverTrigger
          openOnHover
          delay={200}
          className="inline-flex cursor-help items-center justify-center size-4 border border-border text-muted-foreground/60 outline-none transition-colors hover:text-muted-foreground"
        >
          <QuestionMarkIcon size={8} weight="bold" />
        </PopoverTrigger>
        <PopoverPopup tooltipStyle sideOffset={8} className="max-w-56">
          {description}
        </PopoverPopup>
      </Popover>
    </span>
  );
}

function renderValue(value: boolean | string) {
  if (value === true) {
    return (
      <CheckIcon className="mx-auto size-4 text-foreground" weight="bold" />
    );
  }
  if (value === false) {
    return <MinusIcon className="mx-auto size-4 text-muted-foreground/30" />;
  }
  return value;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mb-16 flex items-center gap-4">
      <span className="shrink-0 border border-border px-3 py-1 font-mono text-xs text-muted-foreground">
        {label}
      </span>
      <Separator />
    </div>
  );
}

/* Plan card - landing page style */
function PlanCard({ plan }: { plan: (typeof plans)[0] }) {
  return (
    <div className="flex flex-col justify-between gap-6 border border-border p-8 sm:p-10">
      <div>
        <div className="mb-6">
          <h3 className="font-medium text-xl">{plan.name}</h3>
          <p className="mt-2 min-h-10 text-muted-foreground text-sm">
            {plan.description}
          </p>
          <p className="mt-2 flex items-baseline gap-1">
            <span className="font-semibold text-3xl">{plan.price}</span>
            <span className="text-muted-foreground">{plan.period}</span>
          </p>
        </div>
        <Separator className="mb-6" />
        <ul className="space-y-2 text-sm/6">
          {plan.features.map((feature, index) => (
            <FeatureItem feature={feature} key={index} />
          ))}
        </ul>
      </div>
      <Button
        render={<Link href={plan.href} />}
        size="xl"
        variant={plan.highlighted ? "default" : "outline"}
      >
        {plan.cta}
      </Button>
    </div>
  );
}

/* Sticky comparison header */
function StickyComparisonHeader() {
  return (
    <div className="sticky top-0 z-10 grid grid-cols-3 bg-background">
      <div className="flex items-center px-8 py-4 text-sm text-muted-foreground">
        Features
      </div>
      {plans.map((plan) => (
        <div
          className="flex items-center justify-center gap-3 border-l border-border px-6 py-4"
          key={plan.name}
        >
          <span className="font-semibold text-sm">{plan.name}</span>
          <Button
            render={<Link href={plan.href} />}
            size="sm"
            variant={plan.highlighted ? "default" : "outline"}
          >
            {plan.cta}
          </Button>
        </div>
      ))}
    </div>
  );
}

/* Comparison rows */
function ComparisonRows() {
  return (
    <>
      {comparisonFeatures.map((group) => (
        <div key={group.category}>
          <div className="border-t border-border bg-accent/30 px-8 py-3">
            <span className="font-medium text-sm">{group.category}</span>
          </div>
          {group.features.map((feature) => (
            <div
              className="grid grid-cols-3 border-t border-border/50 text-sm"
              key={feature.name}
            >
              <div className="flex items-center px-8 py-3.5 text-muted-foreground">
                <FeatureTooltip
                  description={feature.description}
                  name={feature.name}
                />
              </div>
              <div className="flex items-center justify-center border-l border-border/50 py-3.5 text-center text-muted-foreground">
                {renderValue(feature.hobby)}
              </div>
              <div className="flex items-center justify-center border-l border-border/50 py-3.5 text-center text-muted-foreground">
                {renderValue(feature.pro)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* V1 - "Pricing" title, cards, gap, sticky table                      */
/* ------------------------------------------------------------------ */

function V1() {
  return (
    <div>
      <SectionLabel label='V1 — "Pricing" + cards + gap + table' />
      <div className="border-border border-x">
        <div className="px-8 pt-16 sm:px-12">
          <h1 className="font-semibold text-4xl tracking-tight sm:text-5xl">
            Pricing
          </h1>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 px-8 sm:px-12 md:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard plan={plan} key={plan.name} />
          ))}
        </div>

        <div className="mt-24 max-sm:hidden">
          <StickyComparisonHeader />
          <ComparisonRows />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* V2 - "Pick your plan", cards, gap, table                            */
/* ------------------------------------------------------------------ */

function V2() {
  return (
    <div>
      <SectionLabel label='V2 — "Pick your plan"' />
      <div className="border-border border-x">
        <div className="px-8 pt-16 sm:px-12">
          <h1 className="font-semibold text-4xl tracking-tight sm:text-5xl">
            Pick your plan
          </h1>
          <p className="mt-3 text-muted-foreground">
            Start with Hobby for free, move to Pro when your traffic demands it.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 px-8 sm:px-12 md:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard plan={plan} key={plan.name} />
          ))}
        </div>

        <div className="mt-24 max-sm:hidden">
          <StickyComparisonHeader />
          <ComparisonRows />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* V3 - No page title, just cards then table                           */
/* ------------------------------------------------------------------ */

function V3() {
  return (
    <div>
      <SectionLabel label="V3 — No title, plans first" />
      <div className="border-border border-x">
        <div className="grid grid-cols-1 gap-6 px-8 pt-16 sm:px-12 md:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard plan={plan} key={plan.name} />
          ))}
        </div>

        <div className="mt-24 max-sm:hidden">
          <StickyComparisonHeader />
          <ComparisonRows />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* V4 - Statement: "Webhooks shouldn't be expensive."                  */
/* ------------------------------------------------------------------ */

function V4() {
  return (
    <div>
      <SectionLabel label="V4 — Webhooks shouldn't be expensive." />
      <div className="border-border border-x">
        <div className="px-8 pt-16 sm:px-12">
          <h1 className="max-w-xl font-semibold text-4xl tracking-tight sm:text-5xl">
            Webhooks shouldn't be expensive.
          </h1>
          <p className="mt-3 max-w-lg text-muted-foreground">
            25,000 webhooks free every month. Scale to millions on Pro with
            pay-as-you-go pricing.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 px-8 sm:px-12 md:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard plan={plan} key={plan.name} />
          ))}
        </div>

        <div className="mt-24 max-sm:hidden">
          <StickyComparisonHeader />
          <ComparisonRows />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* V5 - Two-tone: "Find the right plan for your team."                 */
/* ------------------------------------------------------------------ */

function V5() {
  return (
    <div>
      <SectionLabel label="V5 — Two-tone heading" />
      <div className="border-border border-x">
        <div className="px-8 pt-16 sm:px-12">
          <h1 className="font-semibold text-4xl tracking-tight sm:text-5xl">
            Find the right plan{" "}
            <span className="text-foreground/50">for your team.</span>
          </h1>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 px-8 sm:px-12 md:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard plan={plan} key={plan.name} />
          ))}
        </div>

        <div className="mt-24 max-sm:hidden">
          <StickyComparisonHeader />
          <ComparisonRows />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function TestPage() {
  return (
    <main className="mx-auto max-w-[76rem] space-y-32 py-16">
      <div className="px-8 sm:px-12">
        <h1 className="font-semibold text-3xl tracking-tight">
          Pricing Page Variants
        </h1>
        <p className="mt-2 text-muted-foreground">
          5 layouts: plan cards with feature lists, gap, then comparison table.
        </p>
      </div>

      <V1 />
      <V2 />
      <V3 />
      <V4 />
      <V5 />
    </main>
  );
}
