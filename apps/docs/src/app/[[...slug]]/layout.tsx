"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { PageActions } from "@/components/docs/page-actions";
import { TableOfContents } from "@/components/docs/toc";
import { Sidebar } from "@/components/sidebar";

const transition = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

export default function DocsSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  if (isHome) {
    return <>{children}</>;
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <div className="flex gap-12 px-8 pt-6 pb-10 sm:px-12">
          <div className="min-w-0 max-w-4xl flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                initial={{ opacity: 0, y: 4 }}
                key={pathname}
                transition={transition}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
          <aside className="sticky top-20 hidden h-fit w-48 shrink-0 xl:block">
            <TableOfContents />
            <PageActions className="mt-4 flex flex-col" />
          </aside>
        </div>
      </div>
    </div>
  );
}
