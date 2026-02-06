"use client";

import Link from "next/link";
import Image from "next/image";
import { ContextMenu, ContextMenuTrigger, ContextMenuPopup, ContextMenuItem, ScrollArea } from "@usevon/ui";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { Navigation } from "./docs/navigation";
import { Search } from "./docs/search";
import { siteUrl } from "@/lib/urls";

export const Sidebar = () => {
  return (
    <aside className="fixed top-0 hidden h-svh w-64 border-r bg-[color-mix(in_srgb,var(--color-background),var(--color-foreground)_2%)] dark:bg-[color-mix(in_srgb,var(--color-background),white_2%)] lg:block">
      <div className="flex flex-col gap-4 p-6">
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
        <Search />
      </div>
      <ScrollArea className="h-[calc(100svh-7.5rem)] px-6">
        <Navigation />
      </ScrollArea>
    </aside>
  );
};
