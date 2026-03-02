export type DocsSection =
  | "Start Here"
  | "Sending Webhooks"
  | "Operations"
  | "Receiving Webhooks"
  | "Security"
  | "SDKs & Local Dev";

export type DocsPageMeta = {
  slug: string;
  title: string;
  section: DocsSection;
  filePath: string;
};

export const docsPageMeta = [
  {
    slug: "getting-started",
    title: "Quick Start",
    section: "Start Here",
    filePath: "getting-started.mdx",
  },
  {
    slug: "hosting",
    title: "Cloud or Self-Hosted",
    section: "Start Here",
    filePath: "hosting.mdx",
  },
  {
    slug: "endpoints",
    title: "Endpoints",
    section: "Sending Webhooks",
    filePath: "endpoints.mdx",
  },
  {
    slug: "events-deliveries",
    title: "Events & Deliveries",
    section: "Sending Webhooks",
    filePath: "events-deliveries.mdx",
  },
  {
    slug: "retries-recovery",
    title: "Retries & Recovery",
    section: "Sending Webhooks",
    filePath: "retries-recovery.mdx",
  },
  {
    slug: "versioning",
    title: "Payload Versioning",
    section: "Sending Webhooks",
    filePath: "versioning.mdx",
  },
  {
    slug: "analytics",
    title: "Analytics",
    section: "Operations",
    filePath: "analytics.mdx",
  },
  {
    slug: "rate-limits",
    title: "Rate Limits & 429",
    section: "Operations",
    filePath: "rate-limits.mdx",
  },
  {
    slug: "idempotency",
    title: "Idempotency",
    section: "Operations",
    filePath: "idempotency.mdx",
  },
  {
    slug: "inbound",
    title: "Inbound Forwarding",
    section: "Receiving Webhooks",
    filePath: "inbound.mdx",
  },
  {
    slug: "verification",
    title: "Verifying Signatures",
    section: "Receiving Webhooks",
    filePath: "verification.mdx",
  },
  {
    slug: "authentication",
    title: "API Keys & Environments",
    section: "Security",
    filePath: "authentication.mdx",
  },
  {
    slug: "sdk/typescript",
    title: "TypeScript SDK",
    section: "SDKs & Local Dev",
    filePath: "sdk/typescript.mdx",
  },
  {
    slug: "sdk/react",
    title: "React SDK",
    section: "SDKs & Local Dev",
    filePath: "sdk/react.mdx",
  },
  {
    slug: "sdk/cli",
    title: "CLI & Tunnels",
    section: "SDKs & Local Dev",
    filePath: "sdk/cli.mdx",
  },
] as const satisfies readonly DocsPageMeta[];
