import { Button } from "@usevon/ui";
import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { docsUrl, urls } from "@/lib/urls";

type CtaProps = {
  heading?: ReactNode;
  actions?: ReactNode;
  border?: boolean;
};

export function Cta({ heading, actions, border }: CtaProps) {
  return (
    <section
      className={cn(
        "flex flex-col items-start justify-between gap-8 px-8 py-24 sm:px-12 md:flex-row md:items-center",
        border && "border-t border-border",
      )}
    >
      <h2 className="font-semibold text-4xl tracking-tight sm:text-5xl md:text-6xl">
        {heading ?? (
          <>
            Start shipping webhooks
            <br />
            <span className="text-foreground/50">that just work.</span>
          </>
        )}
      </h2>
      <div className="flex shrink-0 gap-4">
        {actions ?? (
          <>
            <Button
              render={<Link href={urls.signup} />}
              size="xl"
            >
              Get Started
            </Button>
            <Button
              render={<Link href={docsUrl()} />}
              size="xl"
              variant="outline"
            >
              Docs
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
