"use client";

import { VonProvider } from "@usevon/react";
import { ToastProvider } from "@usevon/ui";
import { ThemeProvider } from "next-themes";

type ProvidersProps = {
  children: React.ReactNode;
};

export const Providers = (props: ProvidersProps) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ToastProvider>
        <VonProvider apiUrl={apiUrl}>
          {props.children}
        </VonProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};
