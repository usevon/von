import { CodeSnippets } from "@/components/code-snippets";
import { Features } from "@/components/features";
import { Hero } from "@/components/hero";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CodeSnippets />
      <Features />
    </>
  );
}
