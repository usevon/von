"use client";

import { Children, isValidElement, type ReactNode } from "react";
import { cn } from "@usevon/ui";

type TimelineProps = {
  children: ReactNode;
};

export const Timeline = (props: TimelineProps) => {
  const children = Children.toArray(props.children).filter(isValidElement);

  return (
    <ul className="relative space-y-8 border-l border-border pl-8 my-8">
      {children.map((child, index) => (
        <li key={index} className="relative">
          <div className="absolute -left-8 flex size-6 items-center justify-center">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {index + 1}
            </span>
          </div>
          {child}
        </li>
      ))}
    </ul>
  );
};

type TimelineItemProps = {
  title: string;
  children: ReactNode;
};

export const TimelineItem = (props: TimelineItemProps) => {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground">{props.title}</h3>
      <div className="text-muted-foreground prose-p:my-2">{props.children}</div>
    </div>
  );
};
