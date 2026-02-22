import { InfoIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type NoteProps = {
  type?: "info" | "warning";
  title?: string;
  children: ReactNode;
};

export const Note = ({ type = "info", title, children }: NoteProps) => {
  const isWarning = type === "warning";

  return (
    <div
      className={cn(
        "not-prose my-6 border border-border border-l-4 py-3 pr-4 pl-4 text-sm",
        isWarning ? "border-l-warning" : "border-l-info"
      )}
    >
      <div className="flex items-center gap-2">
        {isWarning ? (
          <WarningIcon className="size-4 shrink-0 text-warning" />
        ) : (
          <InfoIcon className="size-4 shrink-0 text-info" />
        )}
        <span
          className={cn(
            "font-semibold text-sm",
            isWarning ? "text-warning" : "text-info"
          )}
        >
          {title ?? (isWarning ? "Warning" : "Note")}
        </span>
      </div>
      <div className="mt-1 text-muted-foreground leading-6">{children}</div>
    </div>
  );
};
