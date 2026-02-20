import { navigation } from "./navigation";

export type SearchResult = {
  id: string;
  title: string;
  section: string;
  href: string;
  snippet?: string;
};

export type SearchDocument = {
  id: string;
  title: string;
  section: string;
  href: string;
  content?: string;
  updatedAt?: number;
};

export const searchDocuments: SearchDocument[] = [
  ...navigation.flatMap((section) =>
    section.items
      .filter((item) => !item.external)
      .map((item) => ({
        id: item.href.slice(1).replace(/\//g, "-"),
        title: item.title,
        section: section.title,
        href: item.href,
        content: "",
      }))
  ),
];

const normalizeText = (value: string) => value.toLowerCase();
const SPLIT_WHITESPACE_REGEX = /\s+/;

const createSnippet = (content: string, query: string) => {
  if (!content) {
    return;
  }

  const cleaned = content.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return;
  }

  const lower = cleaned.toLowerCase();
  const terms = query
    .toLowerCase()
    .split(SPLIT_WHITESPACE_REGEX)
    .filter(Boolean);

  let matchIndex = lower.indexOf(query.toLowerCase());
  if (matchIndex === -1) {
    for (const term of terms) {
      const idx = lower.indexOf(term);
      if (idx !== -1) {
        matchIndex = idx;
        break;
      }
    }
  }

  if (matchIndex === -1) {
    return cleaned.slice(0, 140);
  }

  const start = Math.max(0, matchIndex - 50);
  const end = Math.min(cleaned.length, matchIndex + 90);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < cleaned.length ? "..." : "";

  return `${prefix}${cleaned.slice(start, end).trim()}${suffix}`;
};

const scoreDocument = (
  doc: SearchDocument,
  terms: string[],
  fullQuery: string
) => {
  const title = normalizeText(doc.title);
  const section = normalizeText(doc.section);
  const href = normalizeText(doc.href);
  const content = normalizeText(doc.content ?? "");
  const full = normalizeText(fullQuery);

  let score = 0;

  if (title.includes(full)) {
    score += 120;
  }
  if (href.includes(full)) {
    score += 60;
  }
  if (section.includes(full)) {
    score += 40;
  }
  if (content.includes(full)) {
    score += 20;
  }

  for (const term of terms) {
    if (title.startsWith(term)) {
      score += 30;
    }
    if (title.includes(term)) {
      score += 20;
    }
    if (href.includes(term)) {
      score += 12;
    }
    if (section.includes(term)) {
      score += 10;
    }
    if (content.includes(term)) {
      score += 4;
    }
  }

  return score;
};

export const search = (
  query: string,
  documents: SearchDocument[] = searchDocuments
): SearchResult[] => {
  if (!query.trim()) {
    return [];
  }

  if (!Array.isArray(documents)) {
    return [];
  }

  const trimmed = query.trim();
  const terms = trimmed
    .toLowerCase()
    .split(SPLIT_WHITESPACE_REGEX)
    .filter(Boolean);

  const scored: Array<SearchResult & { score: number }> = [];

  for (const doc of documents) {
    const score = scoreDocument(doc, terms, trimmed);
    if (score <= 0) {
      continue;
    }

    const snippet = createSnippet(doc.content ?? "", trimmed);
    const result: SearchResult & { score: number } = {
      id: doc.id,
      title: doc.title,
      section: doc.section,
      href: doc.href,
      score,
    };

    if (snippet) {
      result.snippet = snippet;
    }

    scored.push(result);
  }

  return scored
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .map(({ score: _score, ...item }) => item);
};
