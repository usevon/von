"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { MagnifyingGlassIcon } from "@phosphor-icons/react";

import { search, searchDocuments, type SearchResult } from "@/lib/search";

export const Search = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>(searchDocuments);
  const router = useRouter();

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (value.trim()) {
      const items = search(value);
      setResults(items);
    } else {
      setResults(searchDocuments);
    }
  }, []);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      setResults(searchDocuments);
      router.push(href);
    },
    [router]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, result) => {
    if (!acc[result.section]) {
      acc[result.section] = [];
    }
    acc[result.section].push(result);
    return acc;
  }, {});

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandDialogTrigger
        render={
          <Button variant="outline" className="w-9 justify-center text-muted-foreground sm:w-80 sm:justify-start sm:gap-2">
            <MagnifyingGlassIcon className="size-4" />
            <span className="hidden flex-1 text-left text-sm sm:block">Search docs...</span>
            <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
          </Button>
        }
      />
      <CommandDialogPopup>
        <Command>
          <CommandInput
            placeholder="Search documentation..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <CommandPanel>
            <CommandList>
              {query.trim() && results.length === 0 && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}
              {Object.entries(groupedResults).map(([section, items]) => (
                <CommandGroup key={section}>
                  <CommandGroupLabel>{section}</CommandGroupLabel>
                  {items.map((result) => (
                    <CommandItem
                      key={result.id}
                      value={result.id}
                      onClick={() => handleSelect(result.href)}
                    >
                      {result.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </CommandPanel>
          <CommandFooter>
            <span>Navigate with ↑↓</span>
            <span>Select with ↵</span>
            <span>Close with esc</span>
          </CommandFooter>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  );
};
