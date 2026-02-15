"use client";

import { ArrowSquareOutIcon, CheckIcon, CopyIcon } from "@phosphor-icons/react";
import {
  BRAND_ASSET_URLS,
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuTrigger,
} from "@usevon/ui";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="364.31" height="273.74" viewBox="0 0 364.31 273.74"><polyline points="273.08 92.3 185.65 91.8 272.58 0 364.31 0 364.31 91.29 181.35 273.74 91.13 273.74 91.64 91.73 0 91.98 92.4 0 183.12 0 182.9 91.79 183.87 182.51" fill="currentColor"/></svg>`;

export function LogoLink() {
  const [copiedSvg, setCopiedSvg] = useState(false);
  const [copiedPng, setCopiedPng] = useState(false);

  const handleCopySvg = async () => {
    await navigator.clipboard.writeText(LOGO_SVG);
    setCopiedSvg(true);
    setTimeout(() => setCopiedSvg(false), 2000);
  };

  const handleCopyPng = () => {
    const svg = new Blob(
      [LOGO_SVG.replace('fill="currentColor"', 'fill="#000000"')],
      { type: "image/svg+xml" },
    );
    const url = URL.createObjectURL(svg);
    const img = document.createElement("img");
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (blob) => {
          if (blob) {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ]);
            setCopiedPng(true);
            setTimeout(() => setCopiedPng(false), 2000);
          }
        }, "image/png");
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
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
        <ContextMenuItem className="justify-between" onClick={handleCopySvg}>
          {copiedSvg ? "Copied!" : "Copy as SVG"}
          {copiedSvg ? (
            <CheckIcon className="size-4" />
          ) : (
            <CopyIcon className="size-4" />
          )}
        </ContextMenuItem>
        <ContextMenuItem className="justify-between" onClick={handleCopyPng}>
          {copiedPng ? "Copied!" : "Copy as PNG"}
          {copiedPng ? (
            <CheckIcon className="size-4" />
          ) : (
            <CopyIcon className="size-4" />
          )}
        </ContextMenuItem>
        <ContextMenuItem
          className="justify-between"
          render={<Link href="/brand" />}
        >
          Brand Kit
          <ArrowSquareOutIcon className="size-4" />
        </ContextMenuItem>
      </ContextMenuPopup>
    </ContextMenu>
  );
}
