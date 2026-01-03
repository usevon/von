"use client";

import { ScrollArea } from "@usevon/ui";
import { Navigation } from "./docs/navigation";

export const Sidebar = () => {
  return (
    <aside className="fixed top-14 hidden h-[calc(100svh-3.5rem)] w-64 border-r bg-[color-mix(in_srgb,var(--color-background),var(--color-foreground)_2%)] dark:bg-[color-mix(in_srgb,var(--color-background),white_2%)] lg:block">
      <ScrollArea className="h-full p-6">
        <Navigation />
      </ScrollArea>
    </aside>
  );
};
