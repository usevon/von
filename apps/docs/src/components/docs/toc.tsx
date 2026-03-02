"use client";

import { animate, motion, useMotionValue } from "motion/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type TocItem = {
  id: string;
  title: string;
  depth: number;
};

const useHeadings = () => {
  const _pathname = usePathname();
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
  }, []);

  return headings;
};

const getActiveId = (headingIds: string[]): string | null => {
  if (!headingIds.length) {
    return null;
  }

  if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 100) {
    return headingIds.at(-1) ?? null;
  }

  let best = headingIds[0];
  for (const id of headingIds) {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top <= 88) {
      best = id;
    }
  }
  return best ?? null;
};

export const TableOfContents = () => {
  const headings = useHeadings();
  const headingIds = useMemo(() => headings.map((h) => h.id), [headings]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const tabRefs = useRef<Map<string, HTMLElement>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);

  const indicatorTop = useMotionValue(0);
  const indicatorHeight = useMotionValue(0);
  const clickAnim = useRef<ReturnType<typeof animate>[]>([]);

  const getTabRect = useCallback((id: string) => {
    const tab = tabRefs.current.get(id);
    const list = listRef.current;
    if (!(tab && list)) {
      return null;
    }
    const listRect = list.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    return { top: tabRect.top - listRect.top, height: tabRect.height };
  }, []);

  // Jump instantly on scroll — cancel any in-flight click animation first
  const syncOnScroll = useCallback(
    (id: string) => {
      const rect = getTabRect(id);
      if (!rect) {
        return;
      }
      for (const animation of clickAnim.current) {
        animation.stop();
      }
      clickAnim.current = [];
      indicatorTop.jump(rect.top);
      indicatorHeight.jump(rect.height);
    },
    [getTabRect, indicatorHeight, indicatorTop]
  );

  // Spring animate on click
  const syncOnClick = useCallback(
    (id: string) => {
      const rect = getTabRect(id);
      if (!rect) {
        return;
      }
      for (const animation of clickAnim.current) {
        animation.stop();
      }
      clickAnim.current = [
        animate(indicatorTop, rect.top, {
          type: "spring",
          stiffness: 500,
          damping: 50,
          mass: 0.3,
        }),
        animate(indicatorHeight, rect.height, {
          type: "spring",
          stiffness: 500,
          damping: 50,
          mass: 0.3,
        }),
      ];
    },
    [getTabRect, indicatorHeight, indicatorTop]
  );

  // Scroll-driven active heading + indicator
  useEffect(() => {
    if (!headingIds.length) {
      setActiveId(null);
      return;
    }

    let rafId: number;

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const id = getActiveId(headingIds);
        if (id === null) {
          return;
        }
        setActiveId(id);
        syncOnScroll(id);
      });
    };

    const id = getActiveId(headingIds);
    if (id) {
      setActiveId(id);
      syncOnScroll(id);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [headingIds, syncOnScroll]);

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const targetY = el.getBoundingClientRect().top + window.scrollY - 64 - 24;
      window.scrollTo({ top: targetY, behavior: "smooth" });
    }
    setActiveId(id);
    syncOnClick(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  if (!headings.length) {
    return null;
  }

  const currentId = activeId ?? headings[0]?.id ?? "";

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
        On This Page
      </p>
      <div
        className="relative flex flex-col border-border border-l"
        ref={listRef}
      >
        <motion.div
          className="absolute left-0 w-0.5 bg-primary"
          style={{ top: indicatorTop, height: indicatorHeight }}
        />

        {headings.map((item) => (
          <button
            className={cn(
              "cursor-pointer border-none bg-transparent py-1 pl-3 text-left text-muted-foreground text-sm no-underline transition-colors",
              "hover:text-foreground",
              item.id === currentId && "text-primary",
              item.depth > 2 && "pl-6"
            )}
            key={item.id}
            onClick={() => scrollToHeading(item.id)}
            ref={(el) => {
              if (el) {
                tabRefs.current.set(item.id, el);
              } else {
                tabRefs.current.delete(item.id);
              }
            }}
            type="button"
          >
            <span className="relative">
              {item.title}
              <span
                aria-hidden
                className="pointer-events-none invisible block h-0 select-none font-medium"
              >
                {item.title}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
