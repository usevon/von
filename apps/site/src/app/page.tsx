import Link from "next/link";
import { Button } from "@usevon/ui";
import { urls } from "@/lib/urls";
import { CodeSnippets } from "@/components/code-snippets";
import { CTA } from "@/components/cta";
import { FAQ } from "@/components/faq";
import { Features } from "@/components/features";
import { Hero } from "@/components/hero";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CodeSnippets />
      <Features />
      <FAQ />
      <CTA
        title="Ready to ship webhooks that just work?"
        description="Start sending reliable webhooks in minutes, free to get started."
      >
        <Button size="lg" render={<Link href={urls.signup} />}>
          Get started
        </Button>
        <Button size="lg" variant="outline" render={<Link href="/contact" />}>
          Contact sales
        </Button>
      </CTA>
    </>
  );
}
