"use client";

import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import {
  Button,
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuTrigger,
} from "@usevon/ui";
import { BRAND_ASSET_URLS } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { appUrl, siteUrl } from "@/lib/urls";
import { MobileNavigation } from "./docs/mobile-navigation";
import { Search } from "./docs/search";

export const Header = () => (
  <header className="sticky top-0 z-50 border-border/80 border-b bg-[color-mix(in_srgb,var(--color-background),var(--color-foreground)_3%)] backdrop-blur-xl dark:bg-[color-mix(in_srgb,var(--color-background),white_4%)]">
    <div className="relative flex h-16 items-center justify-between px-8 sm:px-12">
      <div className="flex items-center gap-4">
        <ContextMenu>
          <ContextMenuTrigger
            render={
              <Link
                className="flex h-7 w-20 items-center no-underline"
                href="/"
              >
                <Image
                  alt="Von"
                  className="h-7 w-auto dark:hidden"
                  height={28}
                  priority
                  src={BRAND_ASSET_URLS.wordmarkBlackSvg}
                  width={80}
                />
                <Image
                  alt="Von"
                  className="hidden h-7 w-auto dark:block"
                  height={28}
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

      <div className="flex items-center gap-2">
        <Search triggerClassName="lg:absolute lg:left-1/2 lg:z-10 lg:w-[24rem] lg:-translate-x-1/2 xl:w-[28rem]" />
        <Button
          className="max-lg:hidden"
          render={<Link href={siteUrl()} />}
          size="lg"
          variant="outline"
        >
          Website
        </Button>
        <Button
          className="max-lg:hidden"
          render={<Link href={appUrl()} />}
          size="lg"
          variant="default"
        >
          Dashboard
        </Button>
        <MobileNavigation />
      </div>
    </div>
  </header>
);
