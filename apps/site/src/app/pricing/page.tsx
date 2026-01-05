import Link from "next/link";
import { Button } from "@usevon/ui";
import { PricingPlans } from "./billing-toggle";
import { PricingFaqs } from "./faqs";
import { ComparisonTable } from "./comparison-table";

export default function PricingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex flex-col items-center gap-6 text-center">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Pricing</h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Simple, predictable pricing for webhook infrastructure that just works.
            </p>
          </div>
          <div className="mt-12">
            <PricingPlans />
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <ComparisonTable />
        </div>
      </section>

      {/* FAQs */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <h2 className="text-xl font-semibold tracking-tight">Questions & Answers</h2>
          <PricingFaqs />
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:flex lg:items-center lg:justify-between lg:px-10">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold tracking-tight">Have more questions?</h2>
            <p className="mt-2 text-muted-foreground">
              Talk to our team about your specific requirements.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-4 lg:mt-0 lg:shrink-0">
            <Button render={<Link href="/contact" />}>
              Contact sales
            </Button>
            <Button variant="ghost" render={<Link href="/docs" />}>
              Read the docs
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
