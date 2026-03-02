import { readFile } from "node:fs/promises";
import { join } from "node:path";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { docsPageMeta } from "@/content/registry-data";
import { remarkStripJsx } from "./remark-strip-jsx";

type PageInfo = {
  slug: string;
  title: string;
  filePath: string;
};

const contentDir = join(process.cwd(), "src", "content");

const processor = unified()
  .use(remarkParse)
  .use(remarkMdx)
  .use(remarkStripJsx)
  .use(remarkStringify);

export const contentPages: PageInfo[] = [
  { slug: "", title: "Home", filePath: "index.mdx" },
  ...docsPageMeta.map((page) => ({
    slug: page.slug,
    title: page.title,
    filePath: page.filePath,
  })),
];

const pagesBySlug = new Map(contentPages.map((p) => [p.slug, p]));

export function getPageBySlug(slug: string): PageInfo | undefined {
  return pagesBySlug.get(slug);
}

export async function getLLMContent(page: PageInfo): Promise<string> {
  const filePath = join(contentDir, page.filePath);

  try {
    const raw = await readFile(filePath, "utf-8");
    return String(await processor.process(raw)).trim();
  } catch {
    return "";
  }
}

export async function getLLMText(page: PageInfo): Promise<string> {
  const processed = await getLLMContent(page);
  if (!processed) {
    return `# ${page.title}\n\nContent not available.`;
  }

  const url = `/${page.slug}`;
  return `# ${page.title}\nURL: ${url}\n\n${processed}`;
}
