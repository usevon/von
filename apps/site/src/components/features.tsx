"use client";

import Link from "next/link";

export const Features = () => {
  const features = [
    {
      title: "Webhooks",
      description:
        "Reliable delivery with automatic retries and circuit breakers.",
      href: "/docs/webhooks",
    },
    {
      title: "Inbound",
      description:
        "Incoming webhooks queued and retried, even when servers are down.",
      href: "/docs/inbound",
    },
    {
      title: "Versioning",
      description: "Schema migrations that don't break existing endpoints.",
      href: "/docs/versioning",
    },
    {
      title: "Batching",
      description: "Bulk events in one request with automatic deduplication.",
      href: "/docs/batching",
    },
  ];

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mb-16 max-w-2xl">
          <h2 className="font-semibold text-3xl tracking-tight sm:text-4xl">
            Webhooks you can rely on, not hope for.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            The infrastructure you'd build anyway, already done.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {features.map((feature) => (
            <div
              className="flex flex-col rounded-2xl bg-muted/50 p-2 dark:bg-white/5"
              key={feature.title}
            >
              <div className="aspect-video overflow-hidden rounded-xl bg-muted dark:bg-white/10" />
              <div className="flex flex-1 flex-col gap-2 p-6">
                <h3 className="font-medium text-lg">{feature.title}</h3>
                <p className="flex-1 text-muted-foreground text-sm">
                  {feature.description}
                </p>
                <Link
                  className="mt-2 font-medium text-foreground text-sm underline-offset-4 hover:underline"
                  href={feature.href}
                >
                  Learn more
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
