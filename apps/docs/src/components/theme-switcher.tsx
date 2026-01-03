"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@usevon/ui";

const themes = [
  { key: "system", icon: MonitorIcon, label: "System theme" },
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
    return <div className="min-h-8 w-20 rounded-lg bg-secondary/50" />;
  }

  return (
    <div className="flex min-h-8 items-center gap-1 rounded-lg bg-secondary/50 px-1">
      {themes.map(({ key, icon: Icon, label }) => {
        const isActive = theme === key;
        return (
          <button
            key={key}
            type="button"
            aria-label={label}
            className="relative flex size-6 cursor-pointer items-center justify-center rounded-md"
            onClick={() => setTheme(key)}
          >
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-md bg-background shadow-sm"
                layoutId="activeTheme"
                transition={{ type: "spring", duration: 0.5 }}
              />
            )}
            <Icon
              className={cn(
                "relative z-10 size-4",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            />
          </button>
        );
      })}
    </div>
  );
};
