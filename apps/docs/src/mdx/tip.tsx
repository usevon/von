"use client";

import { LightbulbIcon } from "@phosphor-icons/react";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@usevon/ui";
import { type ReactNode, useState } from "react";

type TipProps = {
  title: string;
  children: ReactNode;
};

export const Tip = (props: TipProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible
      className="not-prose my-6 border-border border-l-2 bg-muted/40 pt-3 pr-4 pb-3 pl-4"
      onOpenChange={setOpen}
      open={open}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 text-left">
        <LightbulbIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Tip
        </span>
        <span className="flex-1 text-foreground text-sm">{props.title}</span>
        <span className="shrink-0 border border-border bg-background px-2 py-0.5 text-muted-foreground text-xs">
          {open ? "Hide" : "Show details"}
        </span>
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <div className="mt-2 text-muted-foreground text-sm leading-6">
          {props.children}
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
};
