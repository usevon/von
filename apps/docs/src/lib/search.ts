export type SearchResult = {
  id: string;
  title: string;
  section: string;
  href: string;
  content: string;
};

export const searchDocuments: SearchResult[] = [
  {
    id: "home",
    title: "Home",
    section: "Pages",
    href: "/",
    content: "Von webhook infrastructure reliable delivery monitoring",
  },
  {
    id: "getting-started",
    title: "Getting Started",
    section: "Pages",
    href: "/getting-started",
    content: "Get started with Von install SDK quickstart guide",
  },
  {
    id: "guides",
    title: "Guides",
    section: "Pages",
    href: "/guides",
    content: "Guides tutorials examples best practices",
  },
  {
    id: "api",
    title: "API Reference",
    section: "Pages",
    href: "/api",
    content: "API reference endpoints webhooks REST",
  },
  {
    id: "cli",
    title: "CLI",
    section: "Core Concepts",
    href: "/cli",
    content: "CLI command line interface terminal",
  },
  {
    id: "webhooks",
    title: "Webhooks",
    section: "Core Concepts",
    href: "/webhooks",
    content: "Webhooks events delivery retries payloads",
  },
  {
    id: "endpoints",
    title: "Endpoints",
    section: "Core Concepts",
    href: "/endpoints",
    content: "Endpoints destinations URLs configuration",
  },
  {
    id: "events",
    title: "Events",
    section: "Core Concepts",
    href: "/events",
    content: "Events types payloads schemas",
  },
  {
    id: "react",
    title: "React Provider",
    section: "SDK Reference",
    href: "/sdks/react",
    content: "React provider hooks components frontend",
  },
  {
    id: "typescript",
    title: "TypeScript SDK",
    section: "SDK Reference",
    href: "/sdks/typescript",
    content: "TypeScript SDK client API integration",
  },
];

export const search = (query: string): SearchResult[] => {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();

  return searchDocuments.filter(
    (doc) =>
      doc.title.toLowerCase().includes(lowerQuery) ||
      doc.content.toLowerCase().includes(lowerQuery)
  );
};
