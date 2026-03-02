import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Pagination } from "@/components/docs/pagination";
import { HomePage } from "@/components/home-page";
import { docsPageBySlug, docsPages } from "@/content/registry";

type DocsPageProps = {
  params: Promise<{ slug?: string[] }>;
};

const allSlugs = new Set(["", ...docsPages.map((page) => page.slug)]);

function getTitle(slug: string): string {
  if (slug === "") {
    return "Von Docs";
  }

  return docsPageBySlug.get(slug)?.title ?? "Von Docs";
}

export async function generateMetadata(
  props: DocsPageProps
): Promise<Metadata> {
  const params = await props.params;
  const slug = (params.slug ?? []).join("/");

  if (!allSlugs.has(slug)) {
    return { title: "Not Found" };
  }

  const title = getTitle(slug);
  return {
    title: slug === "" ? title : `${title} - Von Docs`,
  };
}

export function generateStaticParams() {
  return [...allSlugs].map((key) => ({
    slug: key === "" ? [] : key.split("/"),
  }));
}

export default async function DocsPage(props: DocsPageProps) {
  const params = await props.params;
  const slug = (params.slug ?? []).join("/");

  if (!allSlugs.has(slug)) {
    notFound();
  }

  if (slug === "") {
    return <HomePage />;
  }

  const page = docsPageBySlug.get(slug);
  if (!page) {
    notFound();
  }

  const Content = page.Component;

  return (
    <>
      <article className="prose prose-h4:border-none pb-16 prose-headings:no-underline">
        <Content />
      </article>
      <Pagination />
    </>
  );
}
