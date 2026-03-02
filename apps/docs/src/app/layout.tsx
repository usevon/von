import { Databuddy } from "@databuddy/sdk/react";
import { BRAND_ASSET_URLS } from "@usevon/ui/lib/utils";
import type { Metadata } from "next";
import { Familjen_Grotesk } from "next/font/google";

import "@/index.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import { ScrollReset } from "@/components/scroll-reset";

const familjen = Familjen_Grotesk({
  variable: "--font-familjen",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Von Documentation",
  description: "Learn how to use Von webhook infrastructure.",
  icons: {
    icon: BRAND_ASSET_URLS.iconBlackPng,
    shortcut: BRAND_ASSET_URLS.iconBlackPng,
    apple: BRAND_ASSET_URLS.iconBlackPng,
  },
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
        <Providers>
          <div className="bg-background text-foreground">
            <div className="mx-auto w-full max-w-304">
              <div className="sm:border-border sm:border-x">
                <ScrollReset />
                <Header />
                <main className="min-w-0">{props.children}</main>
                <Footer />
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
