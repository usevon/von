import Link from "next/link";
import { Button } from "@usevon/ui";
import { PricingPlans } from "./billing-toggle";
import { PricingFaqs } from "./faqs";
import { ComparisonTable } from "./comparison-table";

export default function PricingPage() {
  return (
    <main className="py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        {/* Hero */}
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Pricing</h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Simple, predictable pricing for webhook infrastructure that just works.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="mt-12">
          <PricingPlans />
        </div>

        {/* Comparison Table */}
        <div className="mt-24">
          <ComparisonTable />
        </div>

        {/* FAQs */}
        <div className="mx-auto mt-24 max-w-3xl">
          <h2 className="text-xl font-semibold tracking-tight">Questions & Answers</h2>
          <PricingFaqs />
        </div>

        {/* CTA */}
        <div className="mt-24 flex flex-col items-center gap-6 text-center">
          <h2 className="text-xl font-semibold tracking-tight">Have more questions?</h2>
          <p className="max-w-xl text-muted-foreground">
            Talk to our team about your specific requirements.
          </p>
          <div className="flex items-center gap-4">
            <Button render={<Link href="/contact" />}>
              Contact sales
            </Button>
            <Button variant="ghost" render={<Link href="/docs" />}>
              Read the docs
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
