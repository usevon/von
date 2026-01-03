"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react";

const faqs = [
  {
    question: "What counts as a webhook?",
    answer:
      "A webhook is a single HTTP request sent to an endpoint, and both successful deliveries and retries count toward your monthly limit.",
  },
  {
    question: "What happens if I exceed my webhook limit?",
    answer:
      "On Hobby, we'll reach out about upgrading if you consistently exceed 20k webhooks. On Pro, additional webhooks are billed at $1 per 10,000.",
  },
  {
    question: "How does throughput scaling work?",
    answer:
      "Throughput automatically scales with your monthly volume (volume / 1,000 = throughput). Pro plans include 1.5x burst capacity for traffic spikes.",
  },
  {
    question: "Can I self-host Von?",
    answer:
      "Yes. Our SDKs are MIT licensed and our server components are AGPL-3.0. Contact us for commercial licenses for on-premises deployments.",
  },
  {
    question: "Do you offer a free trial?",
    answer: "Pro plans include a 14-day free trial. No credit card required to start.",
  },
];

export const PricingFaqs = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="mt-8 divide-y divide-border border-y border-border">
      {faqs.map((faq, index) => (
        <div key={faq.question}>
          <button
            type="button"
            onClick={() => setOpenFaq(openFaq === index ? null : index)}
            className="flex w-full items-start justify-between gap-6 py-4 text-left text-foreground"
          >
            {faq.question}
            <Plus
              weight="bold"
              className={`size-5 shrink-0 transition-transform ${openFaq === index ? "rotate-45" : ""}`}
            />
          </button>
          {openFaq === index && (
            <p className="-mt-2 pb-4 pr-12 text-sm/7 text-muted-foreground">{faq.answer}</p>
          )}
        </div>
      ))}
    </div>
  );
};
