import { stat } from "node:fs/promises";
import { join } from "node:path";
import { docsPageMeta } from "@/content/registry-data";
import { contentPages, getLLMContent } from "@/lib/get-llm-text";
import type { SearchDocument } from "@/lib/search";

const SLASH_GLOBAL = /\//g;
const contentDir = join(process.cwd(), "src", "content");

const sectionBySlug = new Map<string, string>([
  ["", "Start Here"],
  ...docsPageMeta.map((page) => [page.slug, page.section] as const),
]);

const normalizeForSearch = (value: string) =>
  value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, " $1 ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, " $1 ")
    .replace(/[>*_#|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const buildSearchIndex = async (): Promise<SearchDocument[]> =>
  await Promise.all(
    contentPages.map(async (page) => {
      const href = page.slug === "" ? "/" : `/${page.slug}`;
      const section = sectionBySlug.get(page.slug) ?? "Docs";
      const content = normalizeForSearch(await getLLMContent(page));
      let updatedAt = 0;

      try {
        const file = await stat(join(contentDir, page.filePath));
        updatedAt = file.mtimeMs;
      } catch {
        // Keep default timestamp when file metadata is unavailable.
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
