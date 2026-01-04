"use client";

import { cn } from "@usevon/ui";

type RowProps = {
  children: React.ReactNode;
};

export const Row = (props: RowProps) => {
  return (
    <div className="my-8 grid grid-cols-1 gap-8 lg:grid-cols-2">{props.children}</div>
  );
};

type ColProps = {
  sticky?: boolean;
  children: React.ReactNode;
};

export const Col = (props: ColProps) => {
  return (
    <div className={cn(props.sticky && "lg:sticky lg:top-24")}>{props.children}</div>
  );
};
