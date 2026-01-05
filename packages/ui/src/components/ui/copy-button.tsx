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
        "absolute right-1.5 top-1.5 z-10 opacity-0 transition-opacity group-hover:opacity-70 hover:!opacity-100",
        props.className
      )}
    >
      {copied ? (
        <CheckIcon className="text-emerald-500" />
      ) : (
        <CopyIcon />
      )}
    </Button>
  );
};
