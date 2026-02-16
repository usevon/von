"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { Button } from "@usevon/ui";
import { usePathname, useRouter } from "next/navigation";

import { navigation, topLinks } from "@/lib/navigation";

// Flatten all navigation items into a single ordered list, excluding external links
const allPages = [
  ...topLinks,
  ...navigation.flatMap((section) => section.items),
].filter((page) => !page.external);

export const Pagination = () => {
  const pathname = usePathname();
  const router = useRouter();

  const currentIndex = allPages.findIndex(
    (page) =>
      page.href === pathname ||
      (page.href !== "/" && pathname.startsWith(`${page.href}/`))
  );

  // Handle home page specifically
  const homeIndex = pathname === "/" ? 0 : currentIndex;
  const actualIndex = homeIndex !== -1 ? homeIndex : currentIndex;

  const prevPage = actualIndex > 0 ? allPages[actualIndex - 1] : null;
  const nextPage =
    actualIndex < allPages.length - 1 ? allPages[actualIndex + 1] : null;

  if (!(prevPage || nextPage)) {
    return null;
  }

  return (
    <div className="mt-16 flex items-center justify-between border-border border-t pt-6">
      {prevPage ? (
        <Button
          className="gap-2"
          onClick={() => router.push(prevPage.href)}
          variant="ghost"
        >
          <ArrowLeftIcon className="size-4" />
          {prevPage.title}
        </Button>
      ) : (
        <div />
      )}

      {nextPage ? (
        <Button
          className="gap-2"
          onClick={() => router.push(nextPage.href)}
          variant="ghost"
        >
          {nextPage.title}
          <ArrowRightIcon className="size-4" />
        </Button>
      ) : (
        <div />
      )}
    </div>
  );
};
