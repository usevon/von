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
    <section>
      <div className="flex flex-col gap-4 px-8 pt-24 pb-16 sm:px-12">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
          Guides
        </p>
        <h2 className="max-w-[28ch] font-semibold text-3xl tracking-tight sm:text-4xl">
          Learn how reliable webhook{" "}
          <span className="text-foreground/50">delivery actually works.</span>
        </h2>
        <div>
          <Button
            render={<Link href={docsUrl("/guides")} />}
            size="xl"
            variant="outline"
          >
            Read All Guides
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 border-border border-t lg:grid-cols-3">
        {articles.map((article) => (
          <div
            className="flex flex-col gap-4 border-border border-b p-8 sm:p-10 lg:border-r lg:last:border-r-0"
            key={article.title}
          >
            <div className="aspect-video w-full border border-border bg-muted" />
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
    </section>
  );
}
