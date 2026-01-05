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
      <CTA />
    </>
  );
}
