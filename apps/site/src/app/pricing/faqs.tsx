import Link from "next/link";
import type { ReactNode } from "react";

type FAQ = {
  question: string;
  answer: ReactNode;
};

const faqs: FAQ[] = [
  {
    question: "What counts as a webhook?",
    answer:
      "A webhook is a single HTTP request sent to an endpoint. Both successful deliveries and retries count toward your monthly limit.",
  },
  {
    question: "What happens if I exceed my limit?",
    answer:
      "On Hobby, we'll reach out about upgrading if you consistently exceed 25k webhooks. On Pro, additional webhooks are billed at $1 per 10,000.",
  },
  {
    question: "How does throughput scaling work?",
    answer:
      "Base throughput is your sustained delivery rate based on your plan's monthly limit. Pro plans also get burst capacity, allowing you to temporarily exceed your base rate at 1.5x during traffic spikes without dropping webhooks.",
  },
  {
    question: "Can I self-host Von?",
    answer: (
      <>
        Yes, Von is fully open source. Our SDKs are MIT licensed and server
        components are AGPL-3.0, so you can deploy on your own infrastructure.{" "}
        <Link
          className="text-foreground underline underline-offset-4"
          href="/contact"
        >
          Contact us
        </Link>{" "}
        if you need a commercial license.
      </>
    ),
  },
  {
    question: "Do you offer a free trial?",
    answer:
      "The Hobby plan is free with 25,000 webhooks per month, so you can try Von without any commitment or credit card.",
  },
  {
    question: "Can I change plans anytime?",
    answer:
      "Yes, upgrade or downgrade whenever you need. Changes take effect immediately, billing is prorated for the remainder of your cycle, and there are no cancellation fees or long-term contracts.",
  },
];

export const PricingFaqs = () => (
  <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
    {faqs.map((faq, index) => (
      <div className="flex flex-col gap-2" key={index}>
        <h3 className="font-medium">{faq.question}</h3>
        <p className="text-muted-foreground text-sm">{faq.answer}</p>
      </div>
    ))}
  </div>
);
