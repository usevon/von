"use client";

import { highlight } from "sugar-high";

import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/ui/copy-button";

type CodeBlockProps = {
  code: string;
  className?: string;
  preClassName?: string;
  activeLines?: Set<number>;
};

export const CodeBlock = (props: CodeBlockProps) => {
  let html: string;

  if (props.activeLines) {
    const lines = props.code.split("\n");
    const highlightedLines = lines.map((line, idx) => {
      const highlighted = highlight(line || " ");
      const isActive = props.activeLines!.has(idx);
      if (isActive) {
        return `<div class="-mx-4 px-4 w-[calc(100%+2rem)] bg-primary/10">${highlighted}</div>`;
      }
      return `<div>${highlighted}</div>`;
    });
    html = highlightedLines.join("");
  } else {
    html = highlight(props.code);
  }

  return (
    <div className={cn("group relative", props.className)}>
      <CopyButton value={props.code} />
      <pre
        className={cn(
          "overflow-x-auto rounded-xl border border-border bg-muted p-4 font-mono text-sm",
          "[&_.sh__line]:leading-relaxed",
          props.preClassName
        )}
      >
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
};
