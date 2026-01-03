"use client";

import { useState } from "react";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "@usevon/ui";
import { PlusIcon } from "@phosphor-icons/react/ssr";

const faqs = [
  {
    question: "What counts as a webhook?",
    answer:
      "A webhook is a single HTTP request sent to an endpoint, and both successful deliveries and retries count toward your monthly limit.",
  },
  {
    question: "What happens if I exceed my webhook limit?",
    answer:
      "On Hobby, we'll reach out about upgrading if you consistently exceed 25k webhooks. On Pro, additional webhooks are billed at $1 per 10,000.",
  },
  {
    question: "How does throughput scaling work?",
    answer:
      "Base throughput is your sustained delivery rate (100k/month = 100/sec) while burst capacity lets Pro plans temporarily exceed that at 1.5x during traffic spikes.",
  },
  {
    question: "Can I self-host Von?",
    answer:
      "Yes, our SDKs are MIT licensed and server components are AGPL-3.0 with commercial licenses available for on-premises deployments.",
  },
  {
    question: "Do you offer a free trial?",
    answer:
      "We offer a free Hobby plan with 25,000 webhooks per month so you can try Von without any commitment.",
  },
];

export const PricingFaqs = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="mt-8 divide-y divide-border border-y border-border">
      {faqs.map((faq, index) => (
        <Collapsible
          key={faq.question}
          open={openFaq === index}
          onOpenChange={(open) => setOpenFaq(open ? index : null)}
        >
          <CollapsibleTrigger className="flex w-full items-start justify-between gap-6 py-4 text-left text-foreground">
            {faq.question}
            <PlusIcon
              weight="bold"
              className={`size-5 shrink-0 transition-transform ${openFaq === index ? "rotate-45" : ""}`}
            />
          </CollapsibleTrigger>
          <CollapsiblePanel>
            <p className="-mt-2 pb-4 pr-12 text-sm/7 text-muted-foreground">{faq.answer}</p>
          </CollapsiblePanel>
        </Collapsible>
      ))}
    </div>
  );
};
