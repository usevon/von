import { contentPages, getLLMText } from "@/lib/get-llm-text";

export const revalidate = false;

export async function GET() {
  const header = `Von - Webhooks infrastructure that just works. Reliable webhook delivery with automatic retries, circuit breakers, and real-time monitoring.
--
`;

  const pages = await Promise.all(contentPages.map(getLLMText));

  return new Response(header + pages.join("\n---\n\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
