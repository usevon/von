import { InfoIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type NoteProps = {
  type?: "info" | "warning";
  children: ReactNode;
};

export const Note = ({ type = "info", children }: NoteProps) => {
  const isWarning = type === "warning";

  return (
    <div
      className={cn(
        "not-prose my-6 flex gap-3 border-l-2 py-3 pr-4 pl-4 text-sm",
        isWarning
          ? "border-warning bg-warning/5 text-warning-foreground"
          : "border-info bg-info/5 text-info-foreground"
      )}
    >
      {isWarning ? (
        <WarningIcon className="mt-0.5 size-4 shrink-0 text-warning" />
      ) : (
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-info" />
      )}
      <div className="text-muted-foreground leading-6">{children}</div>
    </div>
  );
};
