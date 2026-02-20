"use client";

import {
  CheckIcon,
  MinusIcon,
  QuestionMarkIcon,
} from "@phosphor-icons/react";
import {
  Button,
  Popover,
  PopoverTrigger,
  PopoverPopup,
} from "@usevon/ui";
import Link from "next/link";
import { Cta } from "@/components/cta";
import { PlanCard } from "@/components/plan-card";
import { plans } from "@/lib/plans";
import { urls } from "@/lib/urls";

const comparisonFeatures = [
  {
    category: "Usage",
    features: [
      {
        name: "Webhooks/month",
        description:
          "Number of webhook deliveries included in your plan each month.",
        hobby: "25,000",
        pro: "100,000 included",
      },
      {
        name: "Additional webhooks",
        description: "Cost for webhooks beyond your included amount.",
        hobby: false as boolean | string,
        pro: "$1 per 10k" as boolean | string,
      },
      {
        name: "Base throughput",
        description: "Maximum webhooks delivered per second under normal load.",
        hobby: "25/sec",
        pro: "100/sec",
      },
      {
        name: "Burst capacity",
        description: "Temporary throughput boost (1.5x) for traffic spikes.",
        hobby: false as boolean | string,
        pro: "150/sec" as boolean | string,
      },
    ],
  },
  {
    category: "Infrastructure",
    features: [
      {
        name: "Dev tunnels",
        description: "One concurrent tunnel per team member.",
        hobby: "1",
        pro: "1 per member",
      },
      {
        name: "Retention",
        description: "How long webhook delivery logs are stored.",
        hobby: "3 days",
        pro: "90 days",
      },
      {
        name: "Custom domains",
        description: "Use your own domain for webhook endpoints.",
        hobby: false as boolean | string,
        pro: true as boolean | string,
      },
      {
        name: "Dedicated IP",
        description: "Static IP address for customer IP allowlists.",
        hobby: false as boolean | string,
        pro: "+$50/mo per IP" as boolean | string,
      },
    ],
  },
  {
    category: "Team & Support",
    features: [
      {
        name: "Team members",
        description: "Users who can access your Von workspace.",
        hobby: "1",
        pro: "5 included",
      },
      {
        name: "Additional members",
        description: "Cost for each team member beyond the included amount.",
        hobby: false as boolean | string,
        pro: "$5/mo each" as boolean | string,
      },
      {
        name: "Support",
        description: "How you can reach us for help.",
        hobby: "Discord",
        pro: "Discord + Email",
      },
    ],
  },
];

const pricingFaqs = [
  {
    question: "How is usage calculated?",
    answer:
      "One event delivered to one endpoint, including inbound forwards, and retries are always free.",
  },
  {
    question: "What happens when I hit my Hobby limit?",
    answer:
      "Deliveries pause until the next billing cycle, or you can upgrade to Pro for automatic overage billing.",
  },
  {
    question: "How does overage work on Pro?",
    answer:
      "Beyond 100k webhooks per month, additional usage is billed automatically at $1 per 10,000 with no caps.",
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
      "Hobby includes Discord community support. Pro adds priority email support with faster response times.",
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

function ComparisonTooltip({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {name}
      <Popover>
        <PopoverTrigger
          openOnHover
          delay={200}
          className="inline-flex size-4 cursor-help items-center justify-center border border-border text-muted-foreground/60 outline-none transition-colors hover:text-muted-foreground"
        >
          <QuestionMarkIcon size={8} weight="bold" />
        </PopoverTrigger>
        <PopoverPopup tooltipStyle sideOffset={8} className="max-w-56">
          {description}
        </PopoverPopup>
      </Popover>
    </span>
  );
}

function renderValue(value: boolean | string) {
  if (value === true) {
    return (
      <CheckIcon className="mx-auto size-4 text-foreground" weight="bold" />
    );
  }
  if (value === false) {
    return <MinusIcon className="mx-auto size-4 text-muted-foreground/30" />;
  }
  return value;
}

export default function PricingPage() {
  return (
    <main>
      {/* Heading */}
      <div className="px-8 pt-16 pb-12 sm:px-12">
        <h1 className="font-semibold text-4xl tracking-tight sm:text-5xl">
          Pick your plan
        </h1>
        <p className="mt-3 text-muted-foreground">
          Free to start, pay as you scale. No contracts, no surprises.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-6 px-8 sm:px-12 md:grid-cols-2">
        {plans.map((plan) => (
          <PlanCard key={plan.name} plan={plan} />
        ))}
      </div>

      {/* Comparison table */}
      <div className="mt-24 border-border border-b max-sm:hidden">
        {/* Sticky plan names */}
        <div className="sticky top-16 z-10 -mb-px grid h-[53px] grid-cols-3 border-border border-y bg-background/80 backdrop-blur-lg">
          <div />
          {plans.map((plan) => (
            <div
              className="flex items-center justify-between border-border border-l px-6"
              key={plan.name}
            >
              <span className="font-semibold text-sm">{plan.name}</span>
              <Button
                render={<Link href={plan.href} />}
                size="sm"
                variant={plan.highlighted ? "default" : "outline"}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* Sticky category headers stack below plan row */}
        {comparisonFeatures.map((group) => (
          <div key={group.category}>
            <div className="sticky top-[calc(4rem+52px)] z-[9] -mb-px border-border border-t bg-accent/30 px-8 py-3 backdrop-blur-lg">
              <span className="font-medium text-sm">{group.category}</span>
            </div>
            {group.features.map((feature) => (
              <div
                className="grid grid-cols-3 border-border/50 border-t text-sm"
                key={feature.name}
              >
                <div className="flex items-center px-8 py-3.5 text-muted-foreground">
                  <ComparisonTooltip
                    description={feature.description}
                    name={feature.name}
                  />
                </div>
                <div className="flex items-center justify-center border-border/50 border-l py-3.5 text-center text-muted-foreground">
                  {renderValue(feature.hobby)}
                </div>
                <div className="flex items-center justify-center border-border/50 border-l py-3.5 text-center text-muted-foreground">
                  {renderValue(feature.pro)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* FAQ */}
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
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
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
        border
        heading={
          <>
            Ready to ship?
            <br />
            <span className="text-foreground/50">Pick a plan and go.</span>
          </>
        }
        actions={
          <>
            <Button
              render={<Link href={urls.signup} />}
              size="xl"
            >
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
      />
    </main>
  );
}
