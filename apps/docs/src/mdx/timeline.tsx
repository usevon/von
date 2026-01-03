"use client";

import { Children, isValidElement, type ReactNode } from "react";
import { cn, Separator } from "@usevon/ui";

type TimelineProps = {
  children: ReactNode;
};

export const Timeline = (props: TimelineProps) => {
  const children = Children.toArray(props.children).filter(isValidElement);

  return (
    <ul className="relative my-8 space-y-8">
      {children.map((child, index) => (
        <li key={index} className="relative pl-10">
          {/* Vertical line connecting circles */}
          {index !== children.length - 1 && (
            <Separator
              orientation="vertical"
              className="absolute left-[11px] top-6 h-[calc(100%+2rem)]"
            />
          )}
          {/* Number circle */}
          <div className="absolute left-0 top-0 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {index + 1}
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

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const TimelineItem = (props: TimelineItemProps) => {
  const id = slugify(props.title);

  return (
    <div className="space-y-3">
      <h3 id={id} className="font-semibold text-foreground scroll-mt-6">
        {props.title}
      </h3>
      <div className="text-muted-foreground prose-p:my-2">{props.children}</div>
    </div>
  );
};
