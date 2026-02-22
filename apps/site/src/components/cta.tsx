import { Button } from "@usevon/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { docsUrl, urls } from "@/lib/urls";
import { cn } from "@/lib/utils";

type CtaProps = {
  heading?: ReactNode;
  actions?: ReactNode;
  border?: boolean;
};

export function Cta({ heading, actions, border }: CtaProps) {
  return (
    <section
      className={cn(
        "flex flex-col items-start justify-between gap-8 border-border border-t px-8 py-24 sm:px-12 md:flex-row md:items-center",
        border && "border-border border-t"
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
            <Button render={<Link href={urls.signup} />} size="xl">
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
