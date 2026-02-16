"use client";

import { TabsPrimitive as Tabs } from "@usevon/ui";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TocItem = {
  id: string;
  title: string;
  depth: number;
};

const useHeadings = () => {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<TocItem[]>([]);

  useEffect(() => {
    const read = () => {
      const article = document.querySelector("article");
      if (!article) {
        setHeadings([]);
        return;
      }

      const elements = article.querySelectorAll("h2[id]");
      const items: TocItem[] = [];

      for (const el of elements) {
        const id = el.getAttribute("id");
        const title = el.textContent;
        if (id && title) {
          items.push({
            id,
            title,
            depth: el.tagName === "H2" ? 2 : 3,
          });
        }
      }

      setHeadings(items);
    };

    read();
    const frame = requestAnimationFrame(read);
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return headings;
};

const useActiveHeading = (headingIds: string[]) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const manualId = useRef<string | null>(null);
  const manualTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!headingIds.length) {
      setActiveId(null);
      return;
    }

    const update = () => {
      if (manualId.current) return;

      // At the bottom of the page, activate the last heading
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 100) {
        setActiveId(headingIds[headingIds.length - 1]);
        return;
      }

      // Find the last heading that scrolled past 100px from top
      let best = headingIds[0];
      for (const id of headingIds) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 100) {
          best = id;
        }
      }
      setActiveId(best);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [headingIds]);

  const setManual = useCallback((id: string) => {
    manualId.current = id;
    setActiveId(id);

    if (manualTimer.current) clearTimeout(manualTimer.current);
    manualTimer.current = setTimeout(() => {
      manualId.current = null;
    }, 1000);
  }, []);

  return { activeId, setManual };
};

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};

export const TableOfContents = () => {
  const pathname = usePathname();
  const headings = useHeadings();
  const headingIds = useMemo(() => headings.map((h) => h.id), [headings]);
  const { activeId, setManual } = useActiveHeading(headingIds);

  // Track tab element positions for the motion indicator
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 });
  const prevPathnameRef = useRef(pathname);
  const [shouldAnimate, setShouldAnimate] = useState(true);

  const currentId = activeId ?? headings[0]?.id ?? "";

  // Measure active tab position
  useEffect(() => {
    if (!currentId) return;

    const tab = tabRefs.current.get(currentId);
    const list = listRef.current;
    if (!tab || !list) return;

    const listRect = list.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();

    setIndicatorStyle({
      top: tabRect.top - listRect.top,
      height: tabRect.height,
    });
  }, [currentId, headings]);

  // Disable animation on page change, re-enable after
  useEffect(() => {
    if (pathname !== prevPathnameRef.current) {
      prevPathnameRef.current = pathname;
      setShouldAnimate(false);
      const timer = setTimeout(() => setShouldAnimate(true), 50);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  if (!headings.length) {
    return null;
  }

  const scrollToHeading = (id: string) => {
    setManual(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
        On This Page
      </p>
      <div className="relative flex flex-col border-border border-l" ref={listRef}>
        {/* Motion indicator line */}
        <motion.div
          className="absolute left-0 w-0.5 bg-primary"
          animate={{
            top: indicatorStyle.top,
            height: indicatorStyle.height,
          }}
          transition={shouldAnimate ? springTransition : { duration: 0 }}
        />

        {headings.map((item) => (
          <button
            key={item.id}
            ref={(el) => {
              if (el) tabRefs.current.set(item.id, el);
              else tabRefs.current.delete(item.id);
            }}
            className={cn(
              "cursor-pointer border-none bg-transparent py-1 pl-3 text-left text-muted-foreground text-sm no-underline transition-colors",
              "hover:text-foreground",
              item.id === currentId && "text-primary",
              item.depth > 2 && "pl-6"
            )}
            onClick={() => scrollToHeading(item.id)}
            type="button"
          >
            <span className="relative">
              {item.title}
              <span aria-hidden className="pointer-events-none invisible block h-0 font-medium select-none">
                {item.title}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
