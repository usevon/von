import { Button } from "@usevon/ui";
import Link from "next/link";

import { Cta } from "@/components/cta";
import { urls } from "@/lib/urls";

import { PlansSection } from "./_components/plans-section";

const pricingFaqs = [
  {
    question: "How is usage calculated?",
    answer:
      "One event delivered to one endpoint, including inbound forwards, and retries are always free.",
  },
  {
    question: "What happens when I hit my Hobby limit?",
    answer:
      "Deliveries pause until the next billing cycle, or you can upgrade to Pay-as-you-go for automatic overage billing.",
  },
  {
    question: "How does overage work on Pay-as-you-go?",
    answer:
      "Beyond your included usage, additional webhooks are billed automatically at graduated rates starting at $1 per 10,000 with no caps.",
  },
  {
    question: "Can I change plans anytime?",
    answer:
      "Yes, upgrades take effect immediately with prorated billing, and downgrades apply at the end of your billing period.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "The Hobby plan is free forever with 25,000 webhooks per month, no credit card required.",
  },
  {
    question: "Are there any contracts?",
    answer:
      "No. All plans are month-to-month with no commitments, cancel or change anytime.",
  },
  {
    question: "What support is included?",
    answer:
      "Hobby includes Discord community support. Pay-as-you-go adds priority email support with faster response times.",
  },
  {
    question: "Can I self-host instead?",
    answer:
      "Yes, Von is open source and can be self-hosted on your own infrastructure with no usage limits or fees.",
  },
  {
    question: "What happens if an endpoint goes down?",
    answer:
      "Von retries with exponential backoff and pauses failing endpoints automatically until they recover.",
  },
];

export default function PricingPage() {
  return (
    <main>
      <div className="px-8 pt-16 pb-12 sm:px-12">
        <h1 className="font-semibold text-4xl tracking-tight sm:text-5xl">
          Pick your plan
        </h1>
        <p className="mt-4 text-muted-foreground">
          Free to start. Pay only for what you use.
        </p>
      </div>

      <PlansSection />

      <div className="px-8 pt-24 pb-24 sm:px-12">
        <div className="mb-12 flex flex-col gap-4">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
            FAQ
          </p>
          <h2 className="max-w-[28ch] font-semibold text-3xl tracking-tight sm:text-4xl">
            Common questions{" "}
            <span className="text-foreground/50">about pricing.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {pricingFaqs.map((faq) => (
            <div className="flex flex-col gap-2" key={faq.question}>
              <h3 className="font-medium">{faq.question}</h3>
              <p className="text-muted-foreground text-sm">{faq.answer}</p>
            </div>
          ))}
        </div>
        <p className="mt-12 text-muted-foreground text-sm">
          Something not covered here?{" "}
          <Link
            className="text-foreground underline underline-offset-4"
            href="/contact"
          >
            Reach out
          </Link>
        </p>
      </div>

      <Cta
        actions={
          <>
            <Button render={<Link href={urls.signup} />} size="xl">
              Get Started Free
            </Button>
            <Button
              render={<Link href="/contact" />}
              size="xl"
              variant="outline"
            >
              Contact Us
            </Button>
          </>
        }
        border
        heading={
          <>
            Ready to ship?
            <br />
            <span className="text-foreground/50">Pick a plan and go.</span>
          </>
        }
      />
    </main>
  );
}
