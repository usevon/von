import { readFile } from "node:fs/promises";
import { join } from "node:path";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { navigation, topLinks } from "./navigation";
import { remarkStripJsx } from "./remark-strip-jsx";

type PageInfo = {
  slug: string;
  title: string;
  filePath: string;
};

// Special case mappings for slugs that don't match file paths
const filePathOverrides: Record<string, string> = {
  "": "index.mdx",
};

// Build content pages from navigation
function buildContentPages(): PageInfo[] {
  const pages: PageInfo[] = [];

  // Add top links
  for (const link of topLinks) {
    const slug = link.href === "/" ? "" : link.href.slice(1);
    const filePath = filePathOverrides[slug] ?? `${slug}.mdx`;
    pages.push({ slug, title: link.title, filePath });
  }

  // Add navigation items (skip llms.txt)
  for (const section of navigation) {
    for (const item of section.items) {
      if (item.href === "/llms.txt") {
        continue;
      }
      const slug = item.href.slice(1);
      const filePath = filePathOverrides[slug] ?? `${slug}.mdx`;
      pages.push({ slug, title: item.title, filePath });
    }
  }

  return pages;
}

export const contentPages = buildContentPages();

/**
 * Process MDX content to make it LLM-friendly using remark.
 * Strips all JSX components and import/export statements,
 * keeping only the markdown content.
 */
async function processForLLM(content: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkStripJsx)
    .use(remarkStringify)
    .process(content);

  return String(result).trim();
}

/**
 * Get the content directory path
 */
function getContentDir(): string {
  return join(process.cwd(), "src", "content");
}

/**
 * Read and process a single page for LLM consumption
 */
export async function getLLMText(page: PageInfo): Promise<string> {
  const contentDir = getContentDir();
  const filePath = join(contentDir, page.filePath);

  try {
    const rawContent = await readFile(filePath, "utf-8");
    const processed = await processForLLM(rawContent);

    const url = page.slug === "" ? "/" : `/${page.slug}`;

    return `# ${page.title}
URL: ${url}
URL (Markdown): ${url === "/" ? "/index.md" : `${url}.md`}

${processed}`;
  } catch {
    return `# ${page.title}\n\nContent not available.`;
  }
}

/**
 * Get page info by slug
 */
export function getPageBySlug(slug: string): PageInfo | undefined {
  return contentPages.find((p) => p.slug === slug);
}
