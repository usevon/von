"use client";

import {
  CheckCircleIcon,
  QuestionMarkIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import {
  Button,
  Popover,
  PopoverPopup,
  PopoverTrigger,
  Separator,
} from "@usevon/ui";
import Link from "next/link";
import type { ReactNode } from "react";

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
        className="inline-flex cursor-help items-center gap-1.5 outline-none"
        delay={200}
        openOnHover
      >
        {children}
      </PopoverTrigger>
      <PopoverPopup className="max-w-56" sideOffset={8} tooltipStyle>
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
    <span className="inline-flex size-4 items-center justify-center border border-border text-muted-foreground/60 transition-colors hover:text-muted-foreground">
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
        {hintEl ? <> {hintEl}</> : null}
      </span>
    </li>
  );
}

export function PlanCard({
  plan,
  children,
}: {
  plan: Plan;
  children?: ReactNode;
}) {
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
        {children}
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
