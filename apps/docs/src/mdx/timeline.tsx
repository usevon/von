"use client";

import { Separator } from "@usevon/ui";
import { Children, isValidElement, type ReactNode } from "react";

type TimelineProps = {
  children: ReactNode;
};

export const Timeline = (props: TimelineProps) => {
  const children = Children.toArray(props.children).filter(isValidElement);

  return (
    <ul className="relative my-8 space-y-8">
      {children.map((child, index) => (
        <li className="relative pl-10" key={index}>
          {/* Vertical line connecting circles */}
          {index !== children.length - 1 && (
            <Separator
              className="absolute top-6 left-[11px] h-[calc(100%+2rem)]"
              orientation="vertical"
            />
          )}
          {/* Number circle */}
          <div className="absolute top-0 left-0 flex size-6 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground text-xs">
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
      <h3 className="scroll-mt-6 font-semibold text-foreground" id={id}>
        {props.title}
      </h3>
      <div className="prose-p:my-2 text-muted-foreground">{props.children}</div>
    </div>
  );
};
