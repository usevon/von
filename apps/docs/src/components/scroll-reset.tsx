"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

export const ScrollReset = () => {
  const pathname = usePathname();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });

    const viewport = document.querySelector("[data-slot=scroll-area-viewport]");
    if (viewport) {
      viewport.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [pathname]);

  return null;
};
