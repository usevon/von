import { contentPages } from "@/lib/get-llm-text";

export const revalidate = false;

export function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.usevon.com";

  const lines = [
    "# Von Documentation",
    "",
    "> Webhooks infrastructure that just works. Reliable webhook delivery with automatic retries, circuit breakers, and real-time monitoring.",
    "",
    "## Pages",
    "",
    ...contentPages.map((page) => {
      const mdUrl = page.slug === "" ? "/index.md" : `/${page.slug}.md`;
      return `- [${page.title}](${baseUrl}${mdUrl})`;
    }),
    "",
    "## Optional",
    "",
    `- [llms-full.txt](${baseUrl}/llms-full.txt): All documentation in a single file`,
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
