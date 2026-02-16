import { stat } from "node:fs/promises";
import { join } from "node:path";
import { contentPages, getLLMContent } from "@/lib/get-llm-text";
import { navigation } from "@/lib/navigation";
import type { SearchDocument } from "@/lib/search";

export const revalidate = false;
export const dynamic = "force-static";

const SLASH_GLOBAL = /\//g;
const contentDir = join(process.cwd(), "src", "content");

const sectionBySlug = new Map<string, string>();
for (const section of navigation) {
  for (const item of section.items) {
    if (item.external) continue;
    sectionBySlug.set(item.href.slice(1), section.title);
  }
}

const normalizeForSearch = (value: string) =>
  value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, " $1 ")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, " $1 ")
    .replace(/[>*_#|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export async function GET() {
  const docs = await Promise.all(
    contentPages.map(async (page) => {
      const href = `/${page.slug}`;
      const section = sectionBySlug.get(page.slug) ?? "Docs";
      const content = normalizeForSearch(await getLLMContent(page));
      let updatedAt = 0;

      try {
        const file = await stat(join(contentDir, page.filePath));
        updatedAt = file.mtimeMs;
      } catch {
      }

      return {
        id: page.slug.replace(SLASH_GLOBAL, "-") || "home",
        title: page.title,
        section,
        href,
        content,
        updatedAt,
      } satisfies SearchDocument;
    })
  );

  return Response.json(docs, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
