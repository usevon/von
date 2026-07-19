import { Button } from "@usevon/ui";
import Link from "next/link";

import { Cta } from "@/components/cta";
import { PlanCards } from "@/components/plan-cards";
import { PLANS } from "@/lib/calculator";
import { urls } from "@/lib/urls";

import { PlansSection } from "./_components/plans-section";
import { VolumeTable } from "./_components/volume-table";

const pricingFaqs = [
  {
    question: "How is usage calculated?",
    answer:
      "One message delivered to one endpoint, including inbound forwards. Retries are free and never counted.",
  },
  {
    question: "How are large payloads counted?",
    answer:
      "Payloads over 64 KB count as one additional message per 64 KB. A 200 KB payload counts as four messages.",
  },
  {
    question: "What happens when I hit my Free limit?",
    answer:
      "Free is a hard cap, so deliveries pause until the next billing cycle. Upgrading to a paid plan resumes them immediately.",
  },
  {
    question: "How does overage work?",
    answer:
      "Beyond your included messages, paid plans bill overage automatically at your plan rate with no caps.",
  },
  {
    question: "Can I change plans anytime?",
    answer:
      "Yes, upgrades take effect immediately with prorated billing, and downgrades apply at the end of your billing period.",
  },
  {
    question: "Do you charge per seat?",
    answer:
      "No. Every paid plan includes unlimited team members at no extra cost.",
  },
  {
    question: "Are there any contracts?",
    answer:
      "No. All plans are month-to-month with no commitments, cancel or change anytime.",
  },
  {
    question: "What support is included?",
    answer:
      "Free includes Discord community support. Paid plans add email support, and Growth and above get priority response times.",
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
          Free to start. Retries are always free and never counted.
        </p>
      </div>

      <div className="mt-4">
        <PlanCards />
      </div>

      <PlansSection plans={PLANS} />

      <VolumeTable />

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
