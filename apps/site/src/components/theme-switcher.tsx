"use client";

import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { cn } from "@usevon/ui";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

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
    return <div className="h-9 w-[6.5rem] border border-border bg-muted/50" />;
  }

  return (
    <div className="flex h-9 w-fit items-center gap-0.5 border border-border bg-muted/50 p-0.5">
      {themes.map(({ key, icon: Icon, label }) => {
        const isActive = theme === key;
        return (
          <button
            aria-label={label}
            className="relative flex size-8 cursor-pointer items-center justify-center outline-none focus-visible:bg-accent"
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
