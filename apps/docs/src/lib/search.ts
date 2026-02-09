import { navigation, topLinks } from "./navigation";

export type SearchResult = {
  id: string;
  title: string;
  section: string;
  href: string;
};

const LEADING_SLASH = /^\//;
const SLASH_GLOBAL = /\//g;

export const searchDocuments: SearchResult[] = [
  ...topLinks.map((link) => ({
    id: link.href === "/" ? "home" : link.href.replace(LEADING_SLASH, ""),
    title: link.title,
    section: "Pages",
    href: link.href,
  })),
  ...navigation.flatMap((section) =>
    section.items.map((item) => ({
      id: item.href.replace(LEADING_SLASH, "").replace(SLASH_GLOBAL, "-"),
      title: item.title,
      section: section.title,
      href: item.href,
    }))
  ),
];

export const search = (query: string): SearchResult[] => {
  if (!query.trim()) {
    return [];
  }

  const lowerQuery = query.toLowerCase();

  return searchDocuments.filter((doc) =>
    doc.title.toLowerCase().includes(lowerQuery)
  );
};
