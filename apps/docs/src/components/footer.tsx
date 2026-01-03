"use client";

import Link from "next/link";
import { Button } from "@usevon/ui";
import { GithubLogoIcon, DiscordLogoIcon } from "@phosphor-icons/react";
import { ThemeSwitcher } from "./theme-switcher";
import { TextHoverEffect } from "./text-hover-effect";

const footerLinks = {
  explore: [
    { label: "Startups", href: "https://usevon.com/startups" },
    { label: "Developers", href: "https://usevon.com/developers" },
    { label: "Open Source", href: "https://usevon.com/open-source" },
  ],
  resources: [
    { label: "Contact", href: "https://usevon.com/contact" },
    { label: "Blog", href: "https://usevon.com/blog" },
    { label: "Pricing", href: "https://usevon.com/pricing" },
  ],
  documentation: [
    { label: "Home", href: "/" },
    { label: "Getting Started", href: "/getting-started" },
    { label: "Guides", href: "/guides" },
    { label: "API Reference", href: "/api" },
  ],
  legal: [
    { label: "Privacy Policy", href: "https://usevon.com/privacy-policy" },
    { label: "Terms of Service", href: "https://usevon.com/terms-of-service" },
    { label: "Security", href: "https://usevon.com/security" },
    { label: "Subprocessors", href: "https://usevon.com/subprocessors" },
  ],
};

export const Footer = () => {
  return (
    <footer className="bg-foreground/[0.02] dark:bg-white/[0.02]">
      <div className="px-4 pt-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-5">
          <div className="col-span-2 sm:col-span-1">
            <span className="font-semibold text-xl text-foreground">V</span>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Explore
            </h3>
            <ul className="mt-4 flex flex-col items-start">
              {footerLinks.explore.map((link) => (
                <li key={link.href}>
                  <Button
                    variant="ghost"
                    render={<Link href={link.href} />}
                    className="-ml-3 text-foreground"
                  >
                    {link.label}
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Resources
            </h3>
            <ul className="mt-4 flex flex-col items-start">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Button
                    variant="ghost"
                    render={<Link href={link.href} />}
                    className="-ml-3 text-foreground"
                  >
                    {link.label}
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Documentation
            </h3>
            <ul className="mt-4 flex flex-col items-start">
              {footerLinks.documentation.map((link) => (
                <li key={link.href}>
                  <Button
                    variant="ghost"
                    render={<Link href={link.href} />}
                    className="-ml-3 text-foreground"
                  >
                    {link.label}
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Legal
            </h3>
            <ul className="mt-4 flex flex-col items-start">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Button
                    variant="ghost"
                    render={<Link href={link.href} />}
                    className="-ml-3 text-foreground"
                  >
                    {link.label}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-border py-4">
          <Button
            variant="ghost"
            render={<Link href="https://status.usevon.com" target="_blank" />}
            className="w-fit gap-2 text-muted-foreground hover:text-foreground"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-green-500" />
            </span>
            All systems normal
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              render={<Link href="https://github.com/usevon/von" target="_blank" />}
              className="text-muted-foreground hover:text-foreground"
            >
              <GithubLogoIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              render={<Link href="https://discord.gg/usevon" target="_blank" />}
              className="text-muted-foreground hover:text-foreground"
            >
              <DiscordLogoIcon className="size-4" />
            </Button>
            <ThemeSwitcher />
          </div>
        </div>

        <TextHoverEffect text="VON" className="h-32 w-full sm:h-40 lg:h-48" />
      </div>
    </footer>
  );
};
