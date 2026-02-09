"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      className={cn(
        "hover:!opacity-100 absolute top-2 right-2 z-10 opacity-0 transition-all duration-150 group-hover:opacity-70",
        props.className
      )}
      onClick={copy}
      size="icon"
      variant="ghost"
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
