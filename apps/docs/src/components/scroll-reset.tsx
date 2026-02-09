"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

export const ScrollReset = () => {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!pathname) {
      return;
    }
    const main = document.querySelector("main");
    if (main) {
      main.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname]);

  return null;
};
