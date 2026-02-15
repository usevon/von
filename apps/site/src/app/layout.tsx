import { Databuddy } from "@databuddy/sdk/react";
import type { Metadata } from "next";
import { Familjen_Grotesk } from "next/font/google";

import "../index.css";
import { Providers } from "@/components/providers";

const familjen = Familjen_Grotesk({
  variable: "--font-familjen",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Von - Webhook Infrastructure",
  description: "Webhooks infrastructure that just works.",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout(props: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${familjen.variable} antialiased`}>
        <Databuddy
          clientId={process.env.NEXT_PUBLIC_DATABUDDY_CLIENT_ID ?? ""}
          disabled={process.env.NODE_ENV === "development"}
          trackErrors
          trackInteractions
          trackPerformance
          trackScrollDepth
          trackWebVitals
        />
        <Providers>{props.children}</Providers>
      </body>
    </html>
  );
}
