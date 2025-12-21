"use client";

import Link from "next/link";
import { ModeToggle } from "./mode-toggle";

export const Header = () => {
  return (
    <header className="border-b">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-6">
          <Link className="font-bold text-foreground text-xl no-underline" href="/">
            Von
          </Link>
          <Link
            className="text-muted-foreground no-underline hover:text-foreground"
            href="/"
          >
            Home
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
        </div>
      </div>
    </header>
  );
};
