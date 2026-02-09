"use client";

import { Tabs } from "@base-ui/react/tabs";
import {
  BookOpenIcon,
  CodeIcon,
  HouseIcon,
  KeyIcon,
  RocketLaunchIcon,
} from "@phosphor-icons/react";
import { cn } from "@usevon/ui";
import { usePathname, useRouter } from "next/navigation";

import { navigation, topLinks } from "@/lib/navigation";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  house: HouseIcon,
  "rocket-launch": RocketLaunchIcon,
  "book-open": BookOpenIcon,
  code: CodeIcon,
  key: KeyIcon,
};

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

export const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();

  const activeHref = findActiveHref(pathname);

  return (
    <Tabs.Root
      className="flex flex-col"
      onValueChange={(value) => router.push(value as string)}
      orientation="vertical"
      value={activeHref}
    >
      <Tabs.List className="relative flex flex-col gap-y-4">
        {/* Top links */}
        <div className="flex flex-col">
          {topLinks.map((link) => {
            const Icon = link.icon ? iconMap[link.icon] : null;
            return (
              <Tabs.Tab
                className={cn(
                  "flex h-8 w-full cursor-pointer items-center justify-start gap-2 rounded-md px-3 font-medium text-sm outline-none",
                  "text-muted-foreground hover:text-foreground",
                  "data-[active]:text-foreground"
                )}
                key={link.href}
                value={link.href}
              >
                {Icon && <Icon className="size-4" />}
                {link.title}
              </Tabs.Tab>
            );
          })}
        </div>

        {/* Sections */}
        {navigation.map((section) => (
          <div className="flex flex-col gap-2" key={section.title}>
            <h4 className="px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              {section.title}
            </h4>
            <div className="flex flex-col">
              {section.items.map((item) => (
                <Tabs.Tab
                  className={cn(
                    "flex h-8 w-full cursor-pointer items-center justify-start rounded-md px-3 font-medium text-sm outline-none",
                    "text-muted-foreground hover:text-foreground data-[active]:text-foreground"
                  )}
                  key={item.href}
                  value={item.href}
                >
                  {item.title}
                </Tabs.Tab>
              ))}
            </div>
          </div>
        ))}

        {/* Single sliding background indicator */}
        <Tabs.Indicator
          className="absolute top-0 left-0 -z-1 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) translate-y-(--active-tab-top) rounded-md bg-secondary transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
          renderBeforeHydration
        />
      </Tabs.List>
    </Tabs.Root>
  );
};
