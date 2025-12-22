"use client";

import Link from "next/link";
import { Button } from "@usevon/ui";
import { ModeToggle } from "./mode-toggle";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-background">
      <nav className="mx-auto flex h-[5.25rem] max-w-7xl items-center gap-4 px-6 lg:px-10">
        <div className="flex flex-1 items-center">
          <Link className="font-semibold text-foreground text-xl no-underline" href="/">
            Von
          </Link>
        </div>
        <div className="flex gap-2 max-lg:hidden">
          <Button variant="ghost" nativeButton={false} render={<Link href="/pricing" />}>
            Pricing
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link href="https://github.com/usevon/von" target="_blank" />}>
            Docs
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link href="https://github.com/usevon/von" target="_blank" />}>
            GitHub
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-end gap-4">
          <ModeToggle />
          <Button variant="ghost" nativeButton={false} render={<Link href="/login" />} className="max-sm:hidden">
            Log in
          </Button>
          <Button nativeButton={false} render={<Link href="/signup" />}>
            Get started
          </Button>
        </div>
      </nav>
    </header>
  );
};
