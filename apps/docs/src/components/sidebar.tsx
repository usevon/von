"use client";

import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuTrigger,
} from "@usevon/ui";
import Image from "next/image";
import Link from "next/link";
import { siteUrl } from "@/lib/urls";
import { Search } from "./docs/search";

export const Sidebar = () => (
  <aside className="fixed top-0 hidden h-svh w-64 border-r bg-[color-mix(in_srgb,var(--color-background),var(--color-foreground)_2%)] lg:block dark:bg-[color-mix(in_srgb,var(--color-background),white_2%)]">
    <div className="flex flex-col gap-4 p-6">
      <ContextMenu>
        <ContextMenuTrigger
          render={
            <Link className="flex h-6 w-20 items-center no-underline" href="/">
              <Image
                alt="Von"
                className="h-6 w-auto dark:hidden"
                height={24}
                priority
                src="/brand/von-wordmark-black.svg"
                width={80}
              />
              <Image
                alt="Von"
                className="hidden h-6 w-auto dark:block"
                height={24}
                priority
                src="/brand/von-wordmark-white.svg"
                width={80}
              />
            </Link>
          }
        />
        <ContextMenuPopup>
          <ContextMenuItem
            className="justify-between"
            render={
              // biome-ignore lint/a11y/useAnchorContent: content is provided by ContextMenuItem render pattern
              <a
                aria-label="Go to Website"
                href={siteUrl()}
                rel="noopener noreferrer"
                target="_blank"
              />
            }
          >
            Go to Website
            <ArrowSquareOutIcon className="size-4" />
          </ContextMenuItem>
          <ContextMenuItem
            className="justify-between"
            render={
              // biome-ignore lint/a11y/useAnchorContent: content is provided by ContextMenuItem render pattern
              <a
                aria-label="Brand Kit"
                href={siteUrl("/brand")}
                rel="noopener noreferrer"
                target="_blank"
              />
            }
          >
            Brand Kit
            <ArrowSquareOutIcon className="size-4" />
          </ContextMenuItem>
        </ContextMenuPopup>
      </ContextMenu>
      <Search />
    </div>
    <div className="h-[calc(100svh-7.5rem)] overflow-y-auto px-6">
      <Navigation />
    </div>
  </aside>
);
