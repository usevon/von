"use client";

import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import {
  BRAND_ASSET_URLS,
  Button,
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuTrigger,
} from "@usevon/ui";
import Image from "next/image";
import Link from "next/link";
import { appUrl, siteUrl } from "@/lib/urls";
import { MobileNavigation } from "./docs/mobile-navigation";
import { Search } from "./docs/search";

export const Header = () => (
  <header className="sticky top-0 z-50 border-b bg-[color-mix(in_srgb,var(--color-background),var(--color-foreground)_2%)] dark:bg-[color-mix(in_srgb,var(--color-background),white_2%)]">
    <div className="flex h-14 items-center gap-4 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <MobileNavigation />
        <ContextMenu>
          <ContextMenuTrigger
            render={
              <Link
                className="flex h-6 w-20 items-center no-underline"
                href="/"
              >
                <Image
                  alt="Von"
                  className="h-6 w-auto dark:hidden"
                  height={24}
                  priority
                  src={BRAND_ASSET_URLS.wordmarkBlackSvg}
                  width={80}
                />
                <Image
                  alt="Von"
                  className="hidden h-6 w-auto dark:block"
                  height={24}
                  priority
                  src={BRAND_ASSET_URLS.wordmarkWhiteSvg}
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
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <Search />
        <Button render={<Link href={appUrl()} />} size="sm" variant="default">
          Dashboard
        </Button>
      </div>
    </div>
  </header>
);
