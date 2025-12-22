"use client";

import Link from "next/link";
import { Button } from "@usevon/ui";
import { ThemeSwitcher } from "./theme-switcher";
import { TextHoverEffect } from "@/components/text-hover-effect";

const footerLinks = {
  explore: [
    { label: "Startups", href: "/startups" },
    { label: "Developers", href: "/developers" },
    { label: "Open Source", href: "/open-source" },
  ],
  resources: [
    { label: "Blog", href: "/blog" },
    { label: "Pricing", href: "/pricing" },
    { label: "Guides", href: "/guides" },
  ],
  documentation: [
    { label: "Getting Started", href: "/docs/getting-started" },
    { label: "API Reference", href: "/docs/api-reference" },
    { label: "SDKs", href: "/docs/sdks" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Security", href: "/security" },
  ],
};

export const Footer = () => {
  return (
    <footer className="bg-foreground/[0.02] dark:bg-white/[0.02]">
      <div className="mx-auto max-w-7xl px-6 pt-16 lg:px-10">
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
                    nativeButton={false}
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
                    nativeButton={false}
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
                    nativeButton={false}
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
                    nativeButton={false}
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
            nativeButton={false}
            render={<Link href="/status" />}
            className="w-fit gap-2 text-muted-foreground hover:text-foreground"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-green-500" />
            </span>
            All systems normal
          </Button>
          <ThemeSwitcher />
        </div>

        <TextHoverEffect text="VON" className="h-32 w-full sm:h-40 lg:h-48" />
      </div>
    </footer>
  );
};
