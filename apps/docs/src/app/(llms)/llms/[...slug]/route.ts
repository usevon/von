import { contentPages, getLLMText, getPageBySlug } from "@/lib/get-llm-text";
import { notFound } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

export const revalidate = false;

type RouteParams = {
  params: Promise<{ slug: string[] }>;
};

export async function GET(_req: NextRequest, context: RouteParams) {
  const { slug } = await context.params;
  const slugPath = slug.join("/");

  // Handle "index" as the home page
  const normalizedSlug = slugPath === "index" ? "" : slugPath;

  const page = getPageBySlug(normalizedSlug);
  if (!page) {
    notFound();
  }

  const content = await getLLMText(page);

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}

export function generateStaticParams() {
  return contentPages.map((page) => ({
    slug: page.slug === "" ? ["index"] : page.slug.split("/"),
  }));
}
