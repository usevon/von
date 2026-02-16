"use client";

import { Navigation } from "./docs/navigation";

export const Sidebar = () => (
  <aside className="hidden w-64 shrink-0 border-border border-r lg:block">
    <div className="sticky top-16 max-h-[calc(100svh-4rem)] overflow-y-auto p-6">
      <Navigation />
    </div>
  </aside>
);
