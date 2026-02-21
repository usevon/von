import Link from "next/link";

import { PlanCards } from "@/components/plan-cards";

export function Pricing() {
  return (
    <section>
      <div className="flex flex-col gap-4 px-8 pt-24 pb-16 sm:px-12">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
          Pricing
        </p>
        <h2 className="max-w-[24ch] font-semibold text-3xl tracking-tight sm:text-4xl">
          Simple, transparent pricing for every stage.
        </h2>
      </div>

      <PlanCards />

      <div className="px-8 pt-8 pb-24 sm:px-12">
        <p className="text-muted-foreground text-sm">
          Compare all plan features on the{" "}
          <Link
            className="text-foreground underline underline-offset-4"
            href="/pricing"
          >
            pricing page
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
