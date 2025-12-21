"use client";

import { Button } from "@usevon/ui";

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="mb-6 font-bold text-5xl tracking-tight">
          Von
        </h1>
        <p className="mb-8 text-muted-foreground text-xl">
          Webhooks infrastructure that just works.
        </p>
        <div className="flex justify-center gap-4">
          <Button
            size="lg"
            onClick={() => window.open("https://github.com/usevon/von", "_blank")}
          >
            Get Started
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => window.open("https://github.com/usevon/von", "_blank")}
          >
            Documentation
          </Button>
        </div>
      </div>

      <div className="mx-auto mt-24 grid max-w-4xl gap-8 md:grid-cols-3">
        <div className="rounded-lg border p-6">
          <h3 className="mb-2 font-semibold text-lg">Reliable Delivery</h3>
          <p className="text-muted-foreground text-sm">
            Automatic retries with exponential backoff ensure your webhooks always get delivered.
          </p>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="mb-2 font-semibold text-lg">Type-Safe SDK</h3>
          <p className="text-muted-foreground text-sm">
            Full TypeScript support with end-to-end type safety for your webhook payloads.
          </p>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="mb-2 font-semibold text-lg">Self-Hostable</h3>
          <p className="text-muted-foreground text-sm">
            Deploy on your own infrastructure with Docker or use our hosted solution.
          </p>
        </div>
      </div>
    </div>
  );
}
