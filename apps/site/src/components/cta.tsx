import Link from "next/link";
import { Button } from "@usevon/ui";

export const CTA = () => {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6 lg:flex lg:items-center lg:justify-between lg:px-10">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to ship webhooks that just work?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start sending reliable webhooks in minutes, free to get started.
          </p>
        </div>
        <div className="mt-10 flex items-center gap-4 lg:mt-0 lg:shrink-0">
          <Button size="lg" render={<Link href="/signup" />}>
            Get started
          </Button>
          <Button
            size="lg"
            variant="ghost"
            render={<Link href="/contact" />}
          >
            Contact sales
          </Button>
        </div>
      </div>
    </section>
  );
};
