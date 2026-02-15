"use client";

import {
  CheckCircleIcon,
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

export type Feature = {
  label: string;
  hint?: string;
  tooltip?: string;
  excluded?: boolean;
};

export type Plan = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: Feature[];
  cta: string;
  href: string;
  highlighted: boolean;
};

export const plans: Plan[] = [
  {
    name: "Hobby",
    price: "$0",
    period: "/month",
    description: "Everything you need to start shipping webhooks.",
    features: [
      {
        label: "25,000 webhooks/month",
        hint: "free forever",
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
    ],
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
        label: "100,000 webhooks/month",
        hint: "then $1 per 10k",
        tooltip:
          "Includes both inbound and outbound webhooks, retries are free.",
      },
      {
        label: "100/sec throughput",
        hint: "with burst",
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
    ],
    cta: "Get Started",
    href: urls.signupPro,
    highlighted: true,
  },
];

function FeatureTooltip({
  tooltip,
  children,
}: {
  tooltip: string;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={200}
        className="inline-flex cursor-help items-center gap-1.5 outline-none"
      >
        {children}
      </PopoverTrigger>
      <PopoverPopup tooltipStyle sideOffset={8} className="max-w-56">
        {tooltip}
      </PopoverPopup>
    </Popover>
  );
}

function FeatureItem({ feature }: { feature: Feature }) {
  const icon = feature.excluded ? (
    <XCircleIcon
      className="size-4 shrink-0 text-muted-foreground/40"
      weight="fill"
    />
  ) : (
    <CheckCircleIcon className="size-4 shrink-0" weight="fill" />
  );

  const textClass = feature.excluded
    ? "text-muted-foreground/40"
    : "text-muted-foreground";

  const hintEl = feature.hint ? (
    <span className="text-muted-foreground/60">{feature.hint}</span>
  ) : null;

  const questionMark = (
    <span className="inline-flex items-center justify-center size-4 border border-border text-muted-foreground/60 transition-colors hover:text-muted-foreground">
      <QuestionMarkIcon size={8} weight="bold" />
    </span>
  );

  if (feature.tooltip) {
    return (
      <li className="flex items-center gap-3">
        {icon}
        <span className={`flex items-center gap-1.5 ${textClass}`}>
          {feature.label}
          <FeatureTooltip tooltip={feature.tooltip}>
            {hintEl}
            {questionMark}
          </FeatureTooltip>
        </span>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3">
      {icon}
      <span className={textClass}>
        {feature.label}
        {hintEl && <> {hintEl}</>}
      </span>
    </li>
  );
}

export function PlanCard({ plan }: { plan: Plan }) {
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
