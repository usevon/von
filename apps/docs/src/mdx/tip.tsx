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
      className="not-prose my-6 border border-border border-l-4 border-l-muted-foreground/30 py-3 pr-4 pl-4"
      onOpenChange={setOpen}
      open={open}
    >
      <div className="flex w-full items-center gap-2">
        <LightbulbIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
          Tip
        </span>
        <span className="flex-1 text-foreground text-sm">{props.title}</span>
        <CollapsibleTrigger className="shrink-0 text-muted-foreground text-sm underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground">
          {open ? "Hide" : "Show details"}
        </CollapsibleTrigger>
      </div>
      <CollapsiblePanel>
        <div className="mt-2 text-muted-foreground text-sm leading-6">
          {props.children}
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
};
