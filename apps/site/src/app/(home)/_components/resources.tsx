import { Button } from "@usevon/ui";
import Link from "next/link";
import { docsUrl } from "@/lib/urls";

const articles = [
  {
    title: "Getting Started with Von",
    href: docsUrl("/guides/quickstart"),
  },
  {
    title: "Webhook Security Best Practices",
    href: docsUrl("/guides/security"),
  },
  {
    title: "Why Webhook Delivery Fails",
    href: docsUrl("/guides/reliability"),
  },
];

export function Resources() {
  return (
    <section className="px-8 pt-24 pb-24 sm:px-12">
      <div className="flex flex-col gap-12">
        <div className="flex flex-col gap-4">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
            Guides
          </p>
          <h2 className="font-semibold text-3xl tracking-tight sm:text-4xl">
            Learn how webhooks{" "}
            <span className="text-foreground/50">actually work.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {articles.map((article) => (
            <div className="flex flex-col gap-4" key={article.title}>
              <div className="aspect-video w-full bg-muted" />
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
                Guide
              </p>
              <h3 className="font-medium text-base">{article.title}</h3>
              <div className="mt-auto">
                <Button
                  render={<Link href={article.href} />}
                  size="xl"
                  variant="outline"
                >
                  Read Guide
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
