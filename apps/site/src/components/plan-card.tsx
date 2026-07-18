"use client";

import {
  CheckCircleIcon,
  QuestionMarkIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import {
  Button,
  Card,
  Popover,
  PopoverPopup,
  PopoverTrigger,
  Separator,
} from "@usevon/ui";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

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

type FeatureTooltipProps = {
  tooltip: string;
  children: ReactNode;
};

const FeatureTooltip = (props: FeatureTooltipProps) => (
  <Popover>
    <PopoverTrigger
      className="inline-flex cursor-help items-center gap-1.5 outline-none"
      delay={200}
      openOnHover
    >
      {props.children}
    </PopoverTrigger>
    <PopoverPopup className="max-w-56" sideOffset={8} tooltipStyle>
      {props.tooltip}
    </PopoverPopup>
  </Popover>
);

type FeatureItemProps = {
  feature: Feature;
};

const FeatureItem = ({ feature }: FeatureItemProps) => {
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
};

type PlanCardProps = {
  plan: Plan;
  children?: ReactNode;
  className?: string;
};

export const PlanCard = (props: PlanCardProps) => (
  <Card className={cn("justify-between gap-6 p-6 sm:p-8", props.className)}>
    <div>
      <div className="mb-4">
        <h3 className="font-medium text-xl">{props.plan.name}</h3>
        <p className="mt-2 text-muted-foreground text-sm">
          {props.plan.description}
        </p>
        <p className="mt-2 flex items-baseline">
          <span className="font-semibold text-3xl">{props.plan.price}</span>
          <span className="text-muted-foreground text-sm">
            {props.plan.period}
          </span>
        </p>
      </div>
      <Separator className="mb-4" />
      <ul className="space-y-2 text-sm/6">
        {props.plan.features.map((feature) => (
          <FeatureItem feature={feature} key={feature.label} />
        ))}
      </ul>
    </div>
    <Button
      render={<Link href={props.plan.href} />}
      size="xl"
      variant={props.plan.highlighted ? "default" : "outline"}
    >
      {props.plan.cta}
    </Button>
    {props.children}
  </Card>
);
