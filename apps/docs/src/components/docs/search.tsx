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
import { useCallback, useEffect, useState } from "react";

import { type SearchResult, search, searchDocuments } from "@/lib/search";

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
        setOpen((prev) => !prev);
      }
    };
    // Use capture phase for escape to close before Autocomplete handles it
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        e.stopPropagation();
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

  const groupedResults = results.reduce<Record<string, SearchResult[]>>(
    (acc, result) => {
      if (!acc[result.section]) {
        acc[result.section] = [];
      }
      acc[result.section].push(result);
      return acc;
    },
    {}
  );

  return (
    <CommandDialog onOpenChange={setOpen} open={open}>
      <CommandDialogTrigger
        render={
          <Button
            className="w-48 justify-start gap-2 text-muted-foreground"
            size="lg"
            variant="outline"
          >
            <MagnifyingGlassIcon className="size-4" />
            <span className="flex-1 text-left text-sm">Search docs...</span>
            <Kbd>⌘K</Kbd>
          </Button>
        }
      />
      <CommandDialogPopup>
        <Command>
          <CommandInput
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search documentation..."
            value={query}
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
                      onClick={() => handleSelect(result.href)}
                      value={result.id}
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
