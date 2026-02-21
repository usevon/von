import { Databuddy } from "@databuddy/sdk/react";
import type { Metadata } from "next";
import { Familjen_Grotesk } from "next/font/google";

import "../index.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import { ScrollToTop } from "@/components/scroll-to-top";

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
        <Providers>
          <div className="bg-background text-foreground">
            <div className="mx-auto w-full max-w-304">
              <div className="border-border border-x">
                <ScrollToTop />
                <Header />
                {props.children}
                <Footer />
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
