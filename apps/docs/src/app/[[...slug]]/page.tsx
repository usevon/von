import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Pagination } from "@/components/docs/pagination";
import { HomePage } from "@/components/home-page";
import AuthenticationContent from "@/content/authentication.mdx";
import ComparisonContent from "@/content/comparison.mdx";
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
  // Start Here
  "getting-started": {
    Component: GettingStartedContent,
    title: "Quick Start",
    description: "Install the SDK, configure your endpoint, and send your first webhook.",
  },
  comparison: {
    Component: ComparisonContent,
    title: "Von vs Others",
    description: "Compare Von with Svix and Hookdeck.",
  },
  hosting: {
    Component: HostingContent,
    title: "Cloud or Self-Hosted",
    description: "Choose Von Cloud for fast setup, or self-host for full control.",
  },
  // Sending Webhooks
  endpoints: {
    Component: EndpointsContent,
    title: "Endpoints",
    description: "Create and configure webhook endpoints with URL targeting and event filtering.",
  },
  "events-deliveries": {
    Component: EventsDeliveriesContent,
    title: "Events & Deliveries",
    description: "Send events, track delivery status, and replay failed deliveries.",
  },
  "retries-recovery": {
    Component: RetriesRecoveryContent,
    title: "Retries & Recovery",
    description: "Automatic retries with exponential backoff, circuit breakers, and bulk replay.",
  },
  versioning: {
    Component: VersioningContent,
    title: "Payload Versioning",
    description: "Evolve schemas safely and transform payloads per endpoint version.",
  },
  // Receiving Webhooks
  inbound: {
    Component: InboundContent,
    title: "Inbound Forwarding",
    description: "Receive third-party webhooks through stable inbound URLs.",
  },
  verification: {
    Component: VerificationContent,
    title: "Verifying Signatures",
    description: "Verify HMAC signatures on incoming webhooks to confirm authenticity.",
  },
  // Security
  authentication: {
    Component: AuthenticationContent,
    title: "API Keys & Environments",
    description: "Environment-scoped API keys with granular permission scopes.",
  },
  // SDKs & Local Dev
  "sdk/typescript": {
    Component: TypeScriptSdkContent,
    title: "TypeScript SDK",
    description: "Typed APIs for webhooks, endpoints, inbound routes, and version management.",
  },
  "sdk/react": {
    Component: ReactSdkContent,
    title: "React SDK",
    description: "Provider-based hooks for managing endpoints and events from React.",
  },
  "sdk/cli": {
    Component: CliContent,
    title: "CLI & Tunnels",
    description: "Forward webhooks to localhost with secure tunnels.",
  },
};

const getContent = (slug: string[]): ContentEntry | null => {
  const key = slug.join("/");
  return contentMap[key] ?? null;
};

export async function generateMetadata(
  props: DocsPageProps
): Promise<Metadata> {
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
  const isHome = slug.length === 0;

  if (!content) {
    notFound();
  }

  const Content = content.Component;

  if (isHome) {
    return <Content />;
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
