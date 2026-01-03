import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Pagination } from "@/components/docs/pagination";
import { HomePage } from "@/components/home-page";

// Content imports
import QuickstartContent from "@/content/quickstart.mdx";
import AuthenticationContent from "@/content/authentication.mdx";
import IntroductionContent from "@/content/introduction.mdx";
import SendingContent from "@/content/sending.mdx";
import ReceivingContent from "@/content/receiving.mdx";
import VerificationContent from "@/content/verification.mdx";
import VersioningContent from "@/content/versioning.mdx";
import TypeScriptSdkContent from "@/content/sdk/typescript.mdx";
import ReactSdkContent from "@/content/sdk/react.mdx";
import CliContent from "@/content/sdk/cli.mdx";

type DocsPageProps = {
  params: Promise<{ slug?: string[] }>;
};

type ContentEntry = {
  Component: React.ComponentType;
  title: string;
  description?: string;
};

const contentMap: Record<string, ContentEntry> = {
  "": {
    Component: HomePage,
    title: "Home",
    description: "Learn how to use Von webhook infrastructure.",
  },
  "getting-started": {
    Component: QuickstartContent,
    title: "Getting Started",
    description: "Get started with Von in 5 minutes.",
  },
  authentication: {
    Component: AuthenticationContent,
    title: "Authentication",
    description: "Learn how to authenticate with the Von API.",
  },
  introduction: {
    Component: IntroductionContent,
    title: "Introduction",
    description: "Learn what Von is and why you need webhook infrastructure.",
  },
  sending: {
    Component: SendingContent,
    title: "Sending Webhooks",
    description: "Learn how to send webhooks to your customers with Von.",
  },
  receiving: {
    Component: ReceivingContent,
    title: "Receiving Webhooks",
    description: "Learn how to receive webhooks from third-party services.",
  },
  verification: {
    Component: VerificationContent,
    title: "Verification",
    description: "Learn how to verify webhook signatures for security.",
  },
  versioning: {
    Component: VersioningContent,
    title: "Versioning",
    description: "Learn how to evolve webhook payloads without breaking integrations.",
  },
  "sdk/typescript": {
    Component: TypeScriptSdkContent,
    title: "TypeScript SDK",
    description: "Complete reference for the @usevon/sdk package.",
  },
  "sdk/react": {
    Component: ReactSdkContent,
    title: "React SDK",
    description: "React hooks and provider for webhook management.",
  },
  "sdk/cli": {
    Component: CliContent,
    title: "CLI",
    description: "Command-line tool for local webhook development.",
  },
};

const getContent = (slug: string[]): ContentEntry | null => {
  const key = slug.join("/");
  return contentMap[key] ?? null;
};

export async function generateMetadata(props: DocsPageProps): Promise<Metadata> {
  const params = await props.params;
  const slug = params.slug ?? [];
  const content = getContent(slug);

  if (!content) {
    return { title: "Not Found" };
  }

  return {
    title: `${content.title} - Von Docs`,
    description: content.description,
  };
}

export function generateStaticParams() {
  return Object.keys(contentMap).map((key) => ({
    slug: key === "" ? [] : key.split("/"),
  }));
}

export default async function DocsPage(props: DocsPageProps) {
  const params = await props.params;
  const slug = params.slug ?? [];
  const content = getContent(slug);

  if (!content) {
    notFound();
  }

  const Content = content.Component;

  return (
    <div className="max-w-4xl">
      <article className="prose prose-headings:no-underline prose-h4:border-none">
        <Content />
      </article>
      <Pagination />
    </div>
  );
}
