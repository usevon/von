import { Databuddy } from "@databuddy/sdk/react";
import type { Metadata } from "next";
import { Familjen_Grotesk } from "next/font/google";

import "@/index.css";
import { Footer } from "@/components/footer";
import { Providers } from "@/components/providers";
import { ScrollReset } from "@/components/scroll-reset";
import { Sidebar } from "@/components/sidebar";

const familjen = Familjen_Grotesk({
  variable: "--font-familjen",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Von Documentation",
  description: "Learn how to use Von webhook infrastructure.",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout(props: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${familjen.variable} antialiased`}>
        <Databuddy
          clientId={process.env.NEXT_PUBLIC_DATABUDDY_CLIENT_ID!}
          disabled={process.env.NODE_ENV === "development"}
          trackErrors
          trackInteractions
          trackPerformance
          trackScrollDepth
          trackWebVitals
        />
        <Providers>
          <div className="flex min-h-svh flex-col">
            <Sidebar />
            <main className="h-svh overflow-y-auto lg:ml-64">
              <ScrollReset />
              <div className="flex min-h-svh flex-col px-4 pt-6 pb-10 sm:px-6 lg:px-6">
                {props.children}
              </div>
              <Footer />
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
