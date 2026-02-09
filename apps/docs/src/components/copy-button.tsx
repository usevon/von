"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { Button } from "@usevon/ui";
import { useState } from "react";

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
      className={`absolute top-1.5 right-1.5 z-10 opacity-70 hover:opacity-100 ${props.className || ""}`}
      onClick={copy}
      size="icon"
      variant="ghost"
    >
      {copied ? <CheckIcon className="text-emerald-500" /> : <CopyIcon />}
    </Button>
  );
};
