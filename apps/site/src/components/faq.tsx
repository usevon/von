import Link from "next/link";
import { docsUrl } from "@/lib/urls";

const faqs = [
  {
    question: "What is Von?",
    answer:
      "An open-source webhook infrastructure platform that handles reliable delivery with automatic retries, circuit breakers, and real-time monitoring.",
    href: docsUrl("/introduction"),
  },
  {
    question: "What is a webhook?",
    answer:
      "A webhook is an HTTP callback that notifies your application when an event occurs. Instead of polling for updates, webhooks push data to you in real-time.",
    href: docsUrl("/introduction"),
  },
  {
    question: "Is Von open source?",
    answer:
      "Yes, you can self-host Von on your own infrastructure with complete control over your data, or use our managed cloud service.",
    href: "https://github.com/usevon/von",
  },
  {
    question: "How long does it take to integrate?",
    answer:
      "Under 10 minutes to get your first webhook delivered. Install the SDK, add your API key, and start sending events to any URL.",
    href: docsUrl("/getting-started"),
  },
  {
    question: "What happens when a delivery fails?",
    answer:
      "Webhooks are queued and retried with exponential backoff until the endpoint is available again, ensuring no events are lost.",
    href: docsUrl("/sending"),
  },
  {
    question: "Can I receive webhooks from third-party services?",
    answer:
      "Yes, the inbound feature receives webhooks from services like Stripe, GitHub, and Shopify, then queues and forwards them reliably.",
    href: docsUrl("/receiving"),
  },
  {
    question: "How do I verify webhooks are authentic?",
    answer:
      "Von signs every payload with HMAC SHA-256 using a unique secret per endpoint. Use the SDK to verify signatures automatically, or check the signature header manually.",
    href: docsUrl("/verification"),
  },
  {
    question: "Can I filter which events an endpoint receives?",
    answer:
      "Yes, subscribe endpoints to specific event types with wildcard support. Use order.* for all order events, or payment.completed for just that one.",
    href: docsUrl("/sending"),
  },
  {
    question: "What SDKs are available?",
    answer:
      "A TypeScript SDK for Node.js and edge runtimes, React hooks for frontend integration, and a CLI for local development with tunnels.",
    href: docsUrl("/sdk/typescript"),
  },
];

export const FAQ = () => (
  <section className="py-24">
    <div className="mx-auto max-w-7xl px-6 lg:px-10">
      <div className="mb-16 max-w-2xl">
        <h2 className="font-semibold text-3xl tracking-tight sm:text-4xl">
          Frequently asked questions
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Everything you need to know about Von.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
        {faqs.map((faq, index) => (
          <div className="flex flex-col gap-2" key={index}>
            <h3 className="font-medium">{faq.question}</h3>
            <p className="flex-1 text-muted-foreground text-sm">{faq.answer}</p>
            <Link
              className="font-medium text-foreground text-sm underline-offset-4 hover:underline"
              href={faq.href}
            >
              Learn more
            </Link>
          </div>
        ))}
      </div>
    </div>
  </section>
);
