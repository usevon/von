"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export const ScrollReset = () => {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const hash = window.location.hash;
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));

      const scrollToTarget = () => {
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ block: "start" });
          return true;
        }
        return false;
      };

      if (!scrollToTarget()) {
        requestAnimationFrame(() => {
          scrollToTarget();
        });
      }
      return;
    }

    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};
