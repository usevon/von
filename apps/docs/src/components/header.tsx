"use client";

import Link from "next/link";
import Image from "next/image";
import { Button, ContextMenu, ContextMenuTrigger, ContextMenuPopup, ContextMenuItem } from "@usevon/ui";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { MobileNavigation } from "./docs/mobile-navigation";
import { Search } from "./docs/search";
import { siteUrl, appUrl } from "@/lib/urls";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 border-b bg-[color-mix(in_srgb,var(--color-background),var(--color-foreground)_2%)] dark:bg-[color-mix(in_srgb,var(--color-background),white_2%)]">
      <div className="flex h-14 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <MobileNavigation />
          <ContextMenu>
            <ContextMenuTrigger
              render={
                <Link href="/" className="flex h-6 w-20 items-center no-underline">
                  <Image
                    src="/brand/von-wordmark-black.svg"
                    alt="Von"
                    width={80}
                    height={24}
                    priority
                    className="h-6 w-auto dark:hidden"
                  />
                  <Image
                    src="/brand/von-wordmark-white.svg"
                    alt="Von"
                    width={80}
                    height={24}
                    priority
                    className="hidden h-6 w-auto dark:block"
                  />
                </Link>
              }
            />
            <ContextMenuPopup>
              <ContextMenuItem render={<a href={siteUrl()} target="_blank" rel="noopener noreferrer" />} className="justify-between">
                Go to Website
                <ArrowSquareOutIcon className="size-4" />
              </ContextMenuItem>
              <ContextMenuItem render={<a href={siteUrl("/brand")} target="_blank" rel="noopener noreferrer" />} className="justify-between">
                Brand Kit
                <ArrowSquareOutIcon className="size-4" />
              </ContextMenuItem>
            </ContextMenuPopup>
          </ContextMenu>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Search />
          <Button variant="default" size="sm" render={<Link href={appUrl()} />}>
            Dashboard
          </Button>
        </div>
      </div>
    </header>
  );
};
