import { buildSearchIndex } from "@/lib/search-index";

export const revalidate = false;
export const dynamic = "force-static";

export async function GET() {
  const docs = await buildSearchIndex();

  return Response.json(docs, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
