import type { ComponentType } from "react";
import AnalyticsContent from "@/content/analytics.mdx";
import AuthenticationContent from "@/content/authentication.mdx";
import EndpointsContent from "@/content/endpoints.mdx";
import EventsDeliveriesContent from "@/content/events-deliveries.mdx";
import GettingStartedContent from "@/content/getting-started.mdx";
import HostingContent from "@/content/hosting.mdx";
import IdempotencyContent from "@/content/idempotency.mdx";
import InboundContent from "@/content/inbound.mdx";
import RateLimitsContent from "@/content/rate-limits.mdx";
import { type DocsPageMeta, docsPageMeta } from "@/content/registry-data";
import RetriesRecoveryContent from "@/content/retries-recovery.mdx";
import CliContent from "@/content/sdk/cli.mdx";
import ReactSdkContent from "@/content/sdk/react.mdx";
import TypeScriptSdkContent from "@/content/sdk/typescript.mdx";
import VerificationContent from "@/content/verification.mdx";
import VersioningContent from "@/content/versioning.mdx";

type DocsSlug = (typeof docsPageMeta)[number]["slug"];

const pageComponents: Record<DocsSlug, ComponentType> = {
  "getting-started": GettingStartedContent,
  hosting: HostingContent,
  endpoints: EndpointsContent,
  "events-deliveries": EventsDeliveriesContent,
  "retries-recovery": RetriesRecoveryContent,
  versioning: VersioningContent,
  analytics: AnalyticsContent,
  "rate-limits": RateLimitsContent,
  idempotency: IdempotencyContent,
  inbound: InboundContent,
  verification: VerificationContent,
  authentication: AuthenticationContent,
  "sdk/typescript": TypeScriptSdkContent,
  "sdk/react": ReactSdkContent,
  "sdk/cli": CliContent,
};

export type DocsPage = DocsPageMeta & { Component: ComponentType };

export const docsPages: DocsPage[] = docsPageMeta.map((page) => ({
  ...page,
  Component: pageComponents[page.slug],
}));

export const docsPageBySlug = new Map(
  docsPages.map((page) => [page.slug, page])
);
