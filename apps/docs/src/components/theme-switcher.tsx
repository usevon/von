"use client";

import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const themes = [
  { key: "system", icon: DesktopIcon, label: "System theme" },
  { key: "light", icon: SunIcon, label: "Light theme" },
  { key: "dark", icon: MoonIcon, label: "Dark theme" },
] as const;

export const ThemeSwitcher = () => {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-11 w-[8rem] border border-border bg-muted/50 sm:h-10 sm:w-[7.5rem]" />
    );
  }

  return (
    <div className="flex h-11 w-fit items-center gap-0.5 border border-border bg-muted/50 p-0.5 sm:h-10">
      {themes.map(({ key, icon: Icon, label }) => {
        const isActive = theme === key;
        return (
          <button
            aria-label={label}
            className="relative flex size-10 cursor-pointer items-center justify-center outline-none focus-visible:bg-accent sm:size-9"
            key={key}
            onClick={() => setTheme(key)}
            type="button"
          >
            {isActive ? (
              <motion.div
                className="absolute inset-0 border border-border bg-background"
                layoutId="activeTheme"
                transition={{ type: "spring", duration: 0.5 }}
              />
            ) : null}
            <Icon
              className={cn(
                "relative z-10",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
              size={16}
            />
          </button>
        );
      })}
    </div>
  );
};
