import { readFile } from "node:fs/promises";
import { join } from "node:path";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { navigation } from "./navigation";
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

function buildContentPages(): PageInfo[] {
  const pages: PageInfo[] = [];

  for (const section of navigation) {
    for (const item of section.items) {
      if (item.external) continue;
      const slug = item.href.slice(1);
      pages.push({ slug, title: item.title, filePath: `${slug}.mdx` });
    }
  }

  return pages;
}

export const contentPages = buildContentPages();

const pagesBySlug = new Map(contentPages.map((p) => [p.slug, p]));

export function getPageBySlug(slug: string): PageInfo | undefined {
  return pagesBySlug.get(slug);
}

export async function getLLMText(page: PageInfo): Promise<string> {
  const filePath = join(contentDir, page.filePath);

  try {
    const raw = await readFile(filePath, "utf-8");
    const processed = String(await processor.process(raw)).trim();
    const url = `/${page.slug}`;

    return `# ${page.title}\nURL: ${url}\n\n${processed}`;
  } catch {
    return `# ${page.title}\n\nContent not available.`;
  }
}
