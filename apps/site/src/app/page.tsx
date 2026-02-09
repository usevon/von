import { Button } from "@usevon/ui";
import Link from "next/link";
import { CodeSnippets } from "@/components/code-snippets";
import { CTA } from "@/components/cta";
import { FAQ } from "@/components/faq";
import { Features } from "@/components/features";
import { Hero } from "@/components/hero";
import { urls } from "@/lib/urls";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CodeSnippets />
      <Features />
      <FAQ />
      <CTA
        description="Start sending reliable webhooks in minutes, free to get started."
        title="Ready to ship webhooks that just work?"
      >
        <Button render={<Link href={urls.signup} />} size="lg">
          Get started
        </Button>
        <Button render={<Link href="/contact" />} size="lg" variant="outline">
          Contact sales
        </Button>
      </CTA>
    </>
  );
}
