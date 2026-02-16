"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import {
  Button,
  Command,
  CommandDialog,
  CommandDialogPopup,
  CommandDialogTrigger,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
  Kbd,
} from "@usevon/ui";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import {
  type SearchDocument,
  type SearchResult,
  search,
  searchDocuments,
} from "@/lib/search";
import { cn } from "@/lib/utils";

type SearchProps = {
  triggerClassName?: string;
};

const MAX_DEFAULT_RESULTS = 8;

const byRecency = (documents: SearchDocument[]) =>
  [...documents].sort(
    (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0) || a.title.localeCompare(b.title),
  );

const toResults = (documents: SearchDocument[]): SearchResult[] =>
  documents.map(({ id, title, section, href, content }) => ({
    id,
    title,
    section,
    href,
    snippet: content ? content.slice(0, 140) : undefined,
  }));

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const highlightText = (text: string, query: string): ReactNode => {
  const terms = Array.from(
    new Set(
      query
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean),
    ),
  ).sort((a, b) => b.length - a.length);

  if (terms.length === 0) return text;

  const regex = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "ig");
  const parts = text.split(regex);

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <span className="font-medium text-primary" key={`${part}-${index}`}>
        {part}
      </span>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
};

export const Search = ({ triggerClassName }: SearchProps = {}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [documents, setDocuments] = useState<SearchDocument[]>(searchDocuments);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const loadIndex = async () => {
      try {
        const response = await fetch("/search-index.json", { cache: "force-cache" });
        if (!response.ok) return;

        const data = (await response.json()) as SearchDocument[];
        if (!mounted || !Array.isArray(data)) return;

        const filtered = data.filter((doc) => doc.href !== "/" && !doc.href.startsWith("/llms"));
        if (filtered.length > 0) {
          setDocuments(filtered);
        }
      } catch {
      }
    };

    loadIndex();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keydown", handleEscape, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [open]);

  const hasQuery = query.trim().length > 0;

  const results = useMemo(() => {
    if (hasQuery) {
      return search(query, documents);
    }
    return toResults(byRecency(documents).slice(0, MAX_DEFAULT_RESULTS));
  }, [documents, hasQuery, query]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      setQuery("");
      router.push(result.href);
    },
    [router],
  );

  return (
    <CommandDialog onOpenChange={setOpen} open={open}>
      <CommandDialogTrigger
        render={
          <Button
            className={cn(
              "w-52 justify-start gap-2 text-muted-foreground sm:w-64 lg:w-80 xl:w-[28rem]",
              triggerClassName,
            )}
            size="lg"
            variant="outline"
          >
            <MagnifyingGlassIcon className="size-4" />
            <span className="flex-1 truncate text-left text-sm">Search docs...</span>
            <Kbd>⌘K</Kbd>
          </Button>
        }
      />

      <CommandDialogPopup className="max-w-lg">
        <Command>
          <CommandInput
            id="docs-search-input"
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Search documentation..."
            value={query}
          />

          <CommandPanel>
            <CommandList className="max-h-[min(68vh,40rem)]">
              {hasQuery && results.length === 0 ? (
                <CommandEmpty>No results found.</CommandEmpty>
              ) : null}

              {results.length > 0 ? (
                <CommandGroup>
                  <CommandGroupLabel>{hasQuery ? "Results" : "Recent updates"}</CommandGroupLabel>
                  {results.map((result) => (
                    <CommandItem
                      className="items-start rounded-none"
                      key={result.href}
                      onClick={() => handleSelect(result)}
                      value={result.id}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {hasQuery ? highlightText(result.title, query) : result.title}
                        </p>
                        <p className="truncate text-muted-foreground text-xs">
                          {hasQuery ? highlightText(result.section, query) : result.section}
                        </p>
                        {result.snippet ? (
                          <p className="line-clamp-2 text-muted-foreground text-xs leading-5">
                            {hasQuery ? highlightText(result.snippet, query) : result.snippet}
                          </p>
                        ) : null}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </CommandPanel>

          <CommandFooter>
            <span>Navigate with ↑↓</span>
            <span>Close with esc</span>
          </CommandFooter>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  );
};
