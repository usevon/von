"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type CopyButtonProps = {
  value: string;
  className?: string;
};

export const CopyButton = (props: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(props.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={copy}
      className={cn(
        "absolute right-2 top-2 z-10 opacity-0 transition-all duration-150 group-hover:opacity-70 hover:!opacity-100",
        props.className
      )}
    >
      <span className="relative size-4">
        <CopyIcon
          className={cn(
            "absolute inset-0 transition-all duration-150",
            copied ? "scale-90 opacity-0" : "scale-100 opacity-100"
          )}
        />
        <CheckIcon
          className={cn(
            "absolute inset-0 text-emerald-500 transition-all duration-150",
            copied ? "scale-100 opacity-100" : "scale-90 opacity-0"
          )}
        />
      </span>
    </Button>
  );
};
