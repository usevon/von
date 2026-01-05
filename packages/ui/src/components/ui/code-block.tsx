"use client";

import { highlight } from "sugar-high";

import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/ui/copy-button";

type CodeBlockProps = {
  code: string;
  className?: string;
};

export const CodeBlock = (props: CodeBlockProps) => {
  const html = highlight(props.code);

  return (
    <div className={cn("group relative", props.className)}>
      <CopyButton value={props.code} />
      <pre
        className={cn(
          "overflow-x-auto rounded-xl border border-border bg-muted p-4 font-mono text-sm",
          "[&_.sh__line]:leading-relaxed"
        )}
      >
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
};
