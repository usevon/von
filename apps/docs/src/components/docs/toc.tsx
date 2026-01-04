"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";
import { TabsPrimitive as Tabs, cn } from "@usevon/ui";

type TocItem = {
  id: string;
  title: string;
  depth: number;
};

const useHeadings = () => {
  const [headings, setHeadings] = useState<TocItem[]>([]);

  useEffect(() => {
    const article = document.querySelector("article");
    if (!article) return;

    const elements = article.querySelectorAll("h2[id], h3[id]");
    const items: TocItem[] = [];

    elements.forEach((el) => {
      const id = el.getAttribute("id");
      const title = el.textContent;
      if (id && title) {
        items.push({
          id,
          title,
          depth: el.tagName === "H2" ? 2 : 3,
        });
      }
    });

    setHeadings(items);
  }, []);

  return headings;
};

const useActiveHeading = (headingIds: string[]) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const hasScrolled = useRef(false);

  useEffect(() => {
    if (!headingIds?.length) return;

    setActiveId(headingIds[0] ?? null);
    hasScrolled.current = false;

    const handleScroll = () => {
      hasScrolled.current = true;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!hasScrolled.current) return;

        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "0% 0% -80% 0%" }
    );

    for (const id of headingIds) {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    }

    window.addEventListener("scroll", handleScroll, { once: true, capture: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [headingIds]);

  return activeId;
};

export const TableOfContents = () => {
  const headings = useHeadings();
  const headingIds = useMemo(() => headings.map((h) => h.id), [headings]);
  const activeId = useActiveHeading(headingIds);

  if (!headings.length) return null;

  const currentId = activeId ?? headings[0]?.id ?? "";

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
        On This Page
      </p>
      <Tabs.Root
        value={`#${currentId}`}
        orientation="vertical"
        className="flex flex-col"
      >
        <Tabs.List className="relative flex flex-col border-l border-border">
          {headings.map((item) => (
            <Tabs.Tab
              key={item.id}
              value={`#${item.id}`}
              nativeButton={false}
              render={<Link href={`#${item.id}`} />}
              className={cn(
                "py-1 pl-3 text-sm text-muted-foreground no-underline transition-colors",
                "hover:text-foreground data-[active]:hover:text-primary",
                "data-[active]:font-medium data-[active]:text-primary",
                item.depth > 2 && "pl-6"
              )}
            >
              {item.title}
            </Tabs.Tab>
          ))}
          <Tabs.Indicator className="absolute left-0 top-0 w-0.5 h-[var(--active-tab-height)] translate-y-[var(--active-tab-top)] bg-primary transition-all duration-200" />
        </Tabs.List>
      </Tabs.Root>
    </div>
  );
};
