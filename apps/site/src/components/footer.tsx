"use client";

import Link from "next/link";
import { TextHoverEffect } from "@/components/text-hover-effect";

const footerLinks = {
  product: [
    { label: "Documentation", href: "https://github.com/usevon/von" },
    { label: "API", href: "/api" },
    { label: "Pricing", href: "/pricing" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};

export const Footer = () => {
  return (
    <footer className="bg-foreground/[0.02] dark:bg-white/[0.02]">
      <div className="mx-auto max-w-7xl px-6 pt-16 lg:px-10">
        <div className="grid grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold text-foreground">Product</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">Company</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">Legal</h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground sm:text-sm">
            &copy; {new Date().getFullYear()} USEVON LLC
          </p>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Open source
          </p>
        </div>

        <div className="h-32 w-full sm:h-40 lg:h-48">
          <TextHoverEffect text="VON" />
        </div>
      </div>
    </footer>
  );
};
