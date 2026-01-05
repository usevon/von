"use client";

import { ThemeProvider } from "next-themes";
import { ToastProvider } from "@usevon/ui";

type ProvidersProps = {
  children: React.ReactNode;
};

export const Providers = (props: ProvidersProps) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ToastProvider>
        {props.children}
      </ToastProvider>
    </ThemeProvider>
  );
};
