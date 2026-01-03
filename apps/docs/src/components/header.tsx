"use client";

import Link from "next/link";
import { Button } from "@usevon/ui";
import { MobileNavigation } from "./docs/mobile-navigation";
import { Search } from "./docs/search";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 border-b bg-[color-mix(in_srgb,var(--color-background),var(--color-foreground)_2%)] dark:bg-[color-mix(in_srgb,var(--color-background),white_2%)]">
      <div className="flex h-14 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <MobileNavigation />
          <Link href="/" className="font-semibold text-lg">
            Von
          </Link>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Search />
          <Button variant="default" size="sm" render={<Link href="https://app.usevon.com" />}>
            Dashboard
          </Button>
        </div>
      </div>
    </header>
  );
};
