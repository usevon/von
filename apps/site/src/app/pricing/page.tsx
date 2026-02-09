import { Button } from "@usevon/ui";
import Link from "next/link";
import { CTA } from "@/components/cta";
import { docsUrl } from "@/lib/urls";
import { PricingPlans } from "./billing-toggle";
import { ComparisonTable } from "./comparison-table";
import { PricingFaqs } from "./faqs";

export default function PricingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex flex-col items-center gap-6 text-center">
            <h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">
              Pricing
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Simple, predictable pricing for webhook infrastructure that just
              works.
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
          <h2 className="font-semibold text-xl tracking-tight">
            Questions & Answers
          </h2>
          <PricingFaqs />
        </div>
      </section>

      <CTA
        description="Talk to our team about your specific requirements."
        title="Have more questions?"
      >
        <Button render={<Link href="/contact" />} size="lg">
          Contact sales
        </Button>
        <Button render={<Link href={docsUrl()} />} size="lg" variant="outline">
          Read the docs
        </Button>
      </CTA>
    </main>
  );
}
