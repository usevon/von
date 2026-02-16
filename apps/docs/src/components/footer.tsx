"use client";

import { Button, TextHoverEffect } from "@usevon/ui";
import { BRAND_ASSET_URLS } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { siteUrl } from "@/lib/urls";
import { ThemeSwitcher } from "./theme-switcher";

const footerLinks = {
  resources: [
    { label: "Contact", href: siteUrl("/contact") },
    { label: "Blog", href: siteUrl("/blog") },
    { label: "Pricing", href: siteUrl("/pricing") },
    { label: "Brand", href: siteUrl("/brand") },
  ],
  documentation: [
    { label: "Home", href: "/" },
    { label: "Quick Start", href: "/getting-started" },
    { label: "Endpoints", href: "/endpoints" },
    { label: "TypeScript SDK", href: "/sdk/typescript" },
  ],
  legal: [
    { label: "Privacy Policy", href: siteUrl("/privacy-policy") },
    { label: "Terms of Service", href: siteUrl("/terms-of-service") },
    { label: "Security", href: siteUrl("/security") },
    { label: "Subprocessors", href: siteUrl("/subprocessors") },
  ],
};

const columns = Object.entries(footerLinks).map(([title, links]) => ({
  title: title.charAt(0).toUpperCase() + title.slice(1),
  links,
}));

export const Footer = () => (
  <footer className="border-border border-t">
    <div className="grid grid-cols-1 gap-16 p-8 sm:p-12 md:grid-cols-[auto_1fr]">
      <div className="flex flex-col gap-4">
        <Link className="mt-0.5 flex h-7 w-20 items-center" href={siteUrl()}>
          <Image
            alt="Von"
            className="h-7 w-auto dark:hidden"
            height={28}
            priority
            src={BRAND_ASSET_URLS.iconBlackSvg}
            width={28}
          />
          <Image
            alt="Von"
            className="hidden h-7 w-auto dark:block"
            height={28}
            priority
            src={BRAND_ASSET_URLS.iconWhiteSvg}
            width={28}
          />
        </Link>
        <ThemeSwitcher />
        <div className="mt-auto">
          <p className="text-muted-foreground text-xs">
            &copy; USEVON LLC 2025
          </p>
          <p className="text-muted-foreground text-xs">All rights reserved</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
        {columns.map((column) => (
          <div className="flex flex-col gap-1" key={column.title}>
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
              {column.title}
            </p>
            <ul className="flex flex-col">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Button
                    className="-ml-4 text-foreground"
                    render={<Link href={link.href} />}
                    size="xl"
                    variant="ghost"
                  >
                    {link.label}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>

    <div className="flex h-52 items-center justify-center overflow-hidden sm:h-64 lg:h-72">
      <TextHoverEffect
        className="text-[clamp(8rem,28vw,22rem)]"
        text="VON"
      />
    </div>
  </footer>
);
