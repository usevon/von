"use client";

import { AnchoredToastProvider, ToastProvider } from "@usevon/ui";
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
    <ToastProvider>
      <AnchoredToastProvider>{props.children}</AnchoredToastProvider>
    </ToastProvider>
  </ThemeProvider>
);
