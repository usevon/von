"use client";

import { ToastProvider } from "@usevon/ui";
import { ThemeProvider } from "next-themes";

type ProvidersProps = {
  children: React.ReactNode;
};

export const Providers = (props: ProvidersProps) => (
  <ThemeProvider
    attribute="class"
    defaultTheme="system"
    disableTransitionOnChange
    enableSystem
  >
    <ToastProvider>{props.children}</ToastProvider>
  </ThemeProvider>
);
