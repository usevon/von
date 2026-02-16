"use client";

import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { TabsPrimitive as Tabs } from "@usevon/ui";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { navigation, topLinks } from "@/lib/navigation";

const isPathActive = (pathname: string, href: string) => {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
};

const findActiveHref = (pathname: string) => {
  for (const link of topLinks) {
    if (isPathActive(pathname, link.href)) return link.href;
  }
  for (const section of navigation) {
    for (const item of section.items) {
      if (isPathActive(pathname, item.href)) return item.href;
    }
  }
  return null;
};

const tabClass = cn(
  "relative z-10 flex h-9 w-full cursor-pointer items-center justify-start gap-2 rounded-none px-3 font-medium text-sm outline-none sm:h-8",
  "text-muted-foreground hover:bg-accent hover:text-foreground",
  "data-[active]:text-foreground"
);

export const Navigation = ({ onNavigate }: { onNavigate?: () => void } = {}) => {
  const pathname = usePathname();
  const router = useRouter();
  const activeHref = findActiveHref(pathname);
  const [optimisticHref, setOptimisticHref] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticHref(null);
  }, [pathname]);

  const displayValue = optimisticHref ?? activeHref;

  return (
    <Tabs.Root
      className="flex flex-col"
      onValueChange={(value) => {
        const next = value as string;
        setOptimisticHref(next);
        router.push(next);
        onNavigate?.();
      }}
      orientation="vertical"
      value={displayValue}
    >
      <Tabs.List className="relative flex flex-col gap-y-3">
        <div className="flex flex-col gap-0.5">
          {topLinks.map((link) => (
            <Tabs.Tab className={tabClass} key={link.href} value={link.href}>
              {link.title}
            </Tabs.Tab>
          ))}
        </div>

        {navigation.map((section) => (
          <div className="flex flex-col gap-1" key={section.title}>
            <p className="px-3 font-medium text-muted-foreground/60 text-xs uppercase tracking-widest">
              {section.title}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) =>
                item.external ? (
                  <Link
                    className={cn(
                      "relative z-10 flex h-9 w-full items-center justify-start gap-2 rounded-none px-3 font-medium text-sm sm:h-8",
                      "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    href={item.href}
                    key={item.href}
                    onClick={() => onNavigate?.()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.title}
                    <ArrowSquareOutIcon className="size-3.5 text-muted-foreground/60" />
                  </Link>
                ) : (
                  <Tabs.Tab className={tabClass} key={item.href} value={item.href}>
                    {item.title}
                  </Tabs.Tab>
                )
              )}
            </div>
          </div>
        ))}

        <Tabs.Indicator
          className="absolute top-0 left-0 z-0 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) translate-y-(--active-tab-top) rounded-none bg-accent transition-[width,translate] duration-320 ease-[cubic-bezier(0.22,1,0.36,1)]"
          renderBeforeHydration
        />
      </Tabs.List>
    </Tabs.Root>
  );
};
