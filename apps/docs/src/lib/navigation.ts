import { type DocsSection, docsPageMeta } from "@/content/registry-data";

export type NavLink = {
  title: string;
  href: string;
  external?: boolean;
};

export type NavSection = {
  title: string;
  items: NavLink[];
};

export const topLinks: NavLink[] = [{ title: "Home", href: "/" }];

const docsSectionOrder: DocsSection[] = [
  "Start Here",
  "Sending Webhooks",
  "Operations",
  "Receiving Webhooks",
  "Security",
  "SDKs & Local Dev",
];

const docsSections: NavSection[] = docsSectionOrder
  .map((sectionTitle) => ({
    title: sectionTitle,
    items: docsPageMeta
      .filter((page) => page.section === sectionTitle)
      .map((page) => ({ title: page.title, href: `/${page.slug}` })),
  }))
  .filter((section) => section.items.length > 0);

export const navigation: NavSection[] = [
  ...docsSections,
  {
    title: "LLMs",
    items: [
      { title: "llms.txt", href: "/llms.txt", external: true },
      { title: "llms-full.txt", href: "/llms-full.txt", external: true },
    ],
  },
];
