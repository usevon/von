import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Pagination } from "@/components/docs/pagination";
import { HomePage } from "@/components/home-page";
import AnalyticsContent from "@/content/analytics.mdx";
import AuthenticationContent from "@/content/authentication.mdx";
import EndpointsContent from "@/content/endpoints.mdx";
import EventsDeliveriesContent from "@/content/events-deliveries.mdx";
import GettingStartedContent from "@/content/getting-started.mdx";
import HostingContent from "@/content/hosting.mdx";
import InboundContent from "@/content/inbound.mdx";
import RetriesRecoveryContent from "@/content/retries-recovery.mdx";
import CliContent from "@/content/sdk/cli.mdx";
import ReactSdkContent from "@/content/sdk/react.mdx";
import TypeScriptSdkContent from "@/content/sdk/typescript.mdx";
import VerificationContent from "@/content/verification.mdx";
import VersioningContent from "@/content/versioning.mdx";
import { navigation, topLinks } from "@/lib/navigation";

type DocsPageProps = {
  params: Promise<{ slug?: string[] }>;
};

const pages: Record<string, React.ComponentType> = {
  "getting-started": GettingStartedContent,
  hosting: HostingContent,
  endpoints: EndpointsContent,
  "events-deliveries": EventsDeliveriesContent,
  analytics: AnalyticsContent,
  "retries-recovery": RetriesRecoveryContent,
  versioning: VersioningContent,
  inbound: InboundContent,
  verification: VerificationContent,
  authentication: AuthenticationContent,
  "sdk/typescript": TypeScriptSdkContent,
  "sdk/react": ReactSdkContent,
  "sdk/cli": CliContent,
};

const allSlugs = new Set([
  "",
  ...topLinks.filter((l) => !l.external).map((l) => l.href.slice(1)),
  ...navigation
    .flatMap((s) => s.items)
    .filter((i) => !i.external)
    .map((i) => i.href.slice(1)),
]);

function getTitle(slug: string): string {
  if (slug === "") {
    return "Von Docs";
  }
  for (const link of topLinks) {
    if (link.href === `/${slug}`) {
      return link.title;
    }
  }
  for (const section of navigation) {
    for (const item of section.items) {
      if (item.href === `/${slug}`) {
        return item.title;
      }
    }
  }
  return "Von Docs";
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

  const Content = pages[slug];
  if (!Content) {
    notFound();
  }

  return (
    <>
      <article className="prose prose-h4:border-none pb-16 prose-headings:no-underline">
        <Content />
      </article>
      <Pagination />
    </>
  );
}
