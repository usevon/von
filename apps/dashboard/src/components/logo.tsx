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

export const Logo = () => (
  <ContextMenu>
    <ContextMenuTrigger
      render={
        <Link className="flex h-7 w-20 items-center" href="/">
          <Image
            alt="Von"
            className="h-7 w-auto dark:hidden"
            height={28}
            priority
            src="/brand/von-wordmark-black.svg"
            width={80}
          />
          <Image
            alt="Von"
            className="hidden h-7 w-auto dark:block"
            height={28}
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
          // biome-ignore lint/a11y/useAnchorContent: content provided by ContextMenuItem children
          <a
            aria-label="Go to Website"
            href="https://usevon.com"
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
          // biome-ignore lint/a11y/useAnchorContent: content provided by ContextMenuItem children
          <a
            aria-label="Brand Kit"
            href="https://usevon.com/brand"
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
);
