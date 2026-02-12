"use client";

import { Button, DiscordIcon, GitHubIcon, TextHoverEffect } from "@usevon/ui";
import Image from "next/image";
import Link from "next/link";
import { docsUrl } from "@/lib/urls";
import { ThemeSwitcher } from "./theme-switcher";

const footerLinks = {
  resources: [
    { label: "Contact", href: "/contact" },
    { label: "Blog", href: "/blog" },
    { label: "Pricing", href: "/pricing" },
    { label: "Brand", href: "/brand" },
  ],
  documentation: [
    { label: "Home", href: docsUrl() },
    { label: "Getting Started", href: docsUrl("/getting-started") },
    { label: "Guides", href: docsUrl("/guides") },
    { label: "API Reference", href: docsUrl("/api") },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms-of-service" },
    { label: "Security", href: "/security" },
    { label: "Subprocessors", href: "/subprocessors" },
  ],
};

export const Footer = () => (
  <footer className="bg-foreground/[0.02] dark:bg-white/[0.02]">
    <div className="mx-auto max-w-7xl px-6 pt-16 lg:px-10">
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <Button
            className="-ml-2"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            size="icon-sm"
            variant="ghost"
          >
            <Image
              alt="Von"
              className="size-6 dark:hidden"
              height={24}
              src="/brand/von-icon-black.svg"
              width={24}
            />
            <Image
              alt="Von"
              className="hidden size-6 dark:block"
              height={24}
              src="/brand/von-icon-white.svg"
              width={24}
            />
          </Button>
        </div>

        <div>
          <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
            Resources
          </h3>
          <ul className="mt-4 flex flex-col items-start">
            {footerLinks.resources.map((link) => (
              <li key={link.href}>
                <Button
                  className="-ml-3 text-foreground"
                  render={<Link href={link.href} />}
                  variant="ghost"
                >
                  {link.label}
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
            Documentation
          </h3>
          <ul className="mt-4 flex flex-col items-start">
            {footerLinks.documentation.map((link) => (
              <li key={link.href}>
                <Button
                  className="-ml-3 text-foreground"
                  render={<Link href={link.href} />}
                  variant="ghost"
                >
                  {link.label}
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
            Legal
          </h3>
          <ul className="mt-4 flex flex-col items-start">
            {footerLinks.legal.map((link) => (
              <li key={link.href}>
                <Button
                  className="-ml-3 text-foreground"
                  render={<Link href={link.href} />}
                  variant="ghost"
                >
                  {link.label}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between border-border border-t py-4">
        <Button
          className="w-fit gap-2 text-muted-foreground hover:text-foreground"
          render={<Link href="https://status.usevon.com" target="_blank" />}
          variant="ghost"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
          </span>
          All systems normal
        </Button>
        <div className="flex items-center gap-2">
          <Button
            className="text-muted-foreground hover:text-foreground"
            render={
              <Link href="https://github.com/usevon/von" target="_blank" />
            }
            size="icon-sm"
            variant="ghost"
          >
            <GitHubIcon className="size-4" />
          </Button>
          <Button
            className="text-muted-foreground hover:text-foreground"
            render={<Link href="https://discord.gg/usevon" target="_blank" />}
            size="icon-sm"
            variant="ghost"
          >
            <DiscordIcon className="size-4" />
          </Button>
          <ThemeSwitcher />
        </div>
      </div>

      <TextHoverEffect className="h-32 w-full sm:h-40 lg:h-48" text="VON" />
    </div>
  </footer>
);
