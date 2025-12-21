"use client";

import { VonProvider } from "@usevon/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

type ProvidersProps = {
  children: React.ReactNode;
};

export const Providers = (props: ProvidersProps) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <VonProvider apiUrl={apiUrl}>
        {props.children}
      </VonProvider>
      <Toaster richColors />
    </ThemeProvider>
  );
};
