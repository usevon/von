import Link from "next/link";

const faqs = [
  {
    question: "What is Von?",
    answer:
      "An open-source webhook infrastructure platform that handles reliable delivery with automatic retries, circuit breakers, and real-time monitoring.",
    href: "https://docs.usevon.com/introduction",
  },
  {
    question: "What is a webhook?",
    answer:
      "A webhook is an HTTP callback that notifies your application when an event occurs. Instead of polling for updates, webhooks push data to you in real-time.",
    href: "https://docs.usevon.com/introduction",
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
    href: "https://docs.usevon.com/getting-started",
  },
  {
    question: "What happens when a delivery fails?",
    answer:
      "Webhooks are queued and retried with exponential backoff until the endpoint is available again, ensuring no events are lost.",
    href: "https://docs.usevon.com/sending",
  },
  {
    question: "Can I receive webhooks from third-party services?",
    answer:
      "Yes, the inbound feature receives webhooks from services like Stripe, GitHub, and Shopify, then queues and forwards them reliably.",
    href: "https://docs.usevon.com/receiving",
  },
  {
    question: "How do I verify webhooks are authentic?",
    answer:
      "Von signs every payload with HMAC SHA-256 using a unique secret per endpoint. Use the SDK to verify signatures automatically, or check the signature header manually.",
    href: "https://docs.usevon.com/verification",
  },
  {
    question: "Can I filter which events an endpoint receives?",
    answer:
      "Yes, subscribe endpoints to specific event types with wildcard support. Use order.* for all order events, or payment.completed for just that one.",
    href: "https://docs.usevon.com/sending",
  },
  {
    question: "What SDKs are available?",
    answer:
      "A TypeScript SDK for Node.js and edge runtimes, React hooks for frontend integration, and a CLI for local development with tunnels.",
    href: "https://docs.usevon.com/sdk/typescript",
  },
];

export const FAQ = () => {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mb-16 max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to know about Von.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {faqs.map((faq, index) => (
            <div key={index} className="flex flex-col gap-2">
              <h3 className="font-medium">{faq.question}</h3>
              <p className="flex-1 text-sm text-muted-foreground">{faq.answer}</p>
              <Link
                href={faq.href}
                className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                Learn more
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
