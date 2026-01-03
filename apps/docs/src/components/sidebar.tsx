"use client";

import Link from "next/link";
import { ScrollArea } from "@usevon/ui";
import { Navigation } from "./docs/navigation";
import { Search } from "./docs/search";

export const Sidebar = () => {
  return (
    <aside className="fixed top-0 hidden h-svh w-64 border-r bg-[color-mix(in_srgb,var(--color-background),var(--color-foreground)_2%)] dark:bg-[color-mix(in_srgb,var(--color-background),white_2%)] lg:block">
      <div className="flex flex-col gap-4 p-6">
        <Link href="/" className="font-semibold text-lg">
          Von
        </Link>
        <Search />
      </div>
      <ScrollArea className="h-[calc(100svh-7.5rem)] px-6">
        <Navigation />
      </ScrollArea>
    </aside>
  );
};
