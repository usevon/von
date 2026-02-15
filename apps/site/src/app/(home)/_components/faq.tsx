import type { ReactNode } from "react";



type FAQ = {
  question: string;
  answer: ReactNode;
};

const faqs: FAQ[] = [
  {
    question: "What counts as a webhook?",
    answer:
      "One event delivered to one endpoint, including inbound forwards, and retries are always free.",
  },
  {
    question: "What happens if I exceed my limit?",
    answer:
      "We'll never cut you off without warning. On Hobby, we reach out as you near 25k. On Pro, overages are billed at $1 per 10,000.",
  },
  {
    question: "How does throughput scaling work?",
    answer:
      "Each plan has a sustained delivery rate. Pro plans can burst to 1.5x during traffic spikes without dropping webhooks.",
  },
  {
    question: "Can I self-host Von?",
    answer:
      "Yes, Von is open source (MIT and AGPL-3.0) and can be self-hosted on your own infrastructure with no usage limits.",
  },
  {
    question: "Do you offer a free trial?",
    answer:
      "The Hobby plan is free forever with 25,000 webhooks per month, no credit card required.",
  },
  {
    question: "Can I change plans anytime?",
    answer:
      "Yes, changes take effect immediately with prorated billing and no contracts.",
  },
  {
    question: "What happens when an endpoint is down?",
    answer:
      "Von retries failed deliveries and pauses consistently failing endpoints until they come back online.",
  },
  {
    question: "How do I test webhooks locally?",
    answer: (
      <>
        Install the CLI and run{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">von dev</code>{" "}
        to receive webhooks on localhost through Von's tunnel service.
      </>
    ),
  },
  {
    question: "Do you support inbound webhooks?",
    answer:
      "Yes, Von gives you a permanent URL that forwards incoming webhooks to your app, signed and with retries.",
  },
];

export function Faq() {
  return (
    <section className="px-8 py-24 sm:px-12">
      <div className="mb-12 flex flex-col gap-4">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
          FAQ
        </p>
        <h2 className="max-w-[28ch] font-semibold text-3xl tracking-tight sm:text-4xl">
          Common questions{" "}
          <span className="text-foreground/50">about Von.</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
        {faqs.map((faq) => (
          <div className="flex flex-col gap-2" key={faq.question}>
            <h3 className="font-medium">{faq.question}</h3>
            <p className="text-muted-foreground text-sm">{faq.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
