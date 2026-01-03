"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export const ScrollReset = () => {
  const pathname = usePathname();

  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>(
      "[data-slot=scroll-area-viewport]"
    );
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0 });
    }
  }, [pathname]);

  return null;
};
