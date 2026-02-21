"use client";

import { Collapsible, CollapsibleContent, Switch } from "@usevon/ui";
import type { ReactNode } from "react";

import { AnimatedCurrency } from "./animated-currency";

export function AddOnRow({
  label,
  cost,
  costSuffix = "",
  enabled,
  onToggle,
  children,
}: {
  label: string;
  cost: number;
  costSuffix?: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className="border-border border-t py-4">
      <Collapsible open={enabled && !!children}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Switch
              checked={enabled}
              onCheckedChange={(c) => onToggle(Boolean(c))}
            />
            <p className="font-medium text-sm">{label}</p>
          </div>
          <p className="text-muted-foreground text-sm tabular-nums">
            +<AnimatedCurrency value={cost} />
            {costSuffix}
          </p>
        </div>
        {!!children && (
          <CollapsibleContent className="origin-top overflow-x-visible transition-[height,opacity,transform] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:scale-[0.98] data-starting-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:opacity-0">
            <div className="pt-4">{children}</div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}
