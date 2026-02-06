"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";

import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuTrigger,
} from "@usevon/ui";

export const Logo = () => {
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <Link href="/" className="flex h-7 w-20 items-center">
            <Image
              src="/brand/von-wordmark-black.svg"
              alt="Von"
              width={80}
              height={28}
              priority
              className="h-7 w-auto dark:hidden"
            />
            <Image
              src="/brand/von-wordmark-white.svg"
              alt="Von"
              width={80}
              height={28}
              priority
              className="hidden h-7 w-auto dark:block"
            />
          </Link>
        }
      />
      <ContextMenuPopup>
        <ContextMenuItem
          render={
            <a
              href="https://usevon.com"
              target="_blank"
              rel="noopener noreferrer"
            />
          }
          className="justify-between"
        >
          Go to Website
          <ArrowSquareOutIcon className="size-4" />
        </ContextMenuItem>
        <ContextMenuItem
          render={
            <a
              href="https://usevon.com/brand"
              target="_blank"
              rel="noopener noreferrer"
            />
          }
          className="justify-between"
        >
          Brand Kit
          <ArrowSquareOutIcon className="size-4" />
        </ContextMenuItem>
      </ContextMenuPopup>
    </ContextMenu>
  );
};
