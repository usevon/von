import type { Metadata } from "next";
import { Familjen_Grotesk } from "next/font/google";
import { ScrollArea } from "@usevon/ui";

import "@/index.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/sidebar";
import { Footer } from "@/components/footer";
import { ScrollReset } from "@/components/scroll-reset";

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
        <Providers>
          <div className="flex min-h-svh flex-col">
            <Sidebar />
            <main className="h-svh lg:ml-64">
              <ScrollArea className="h-full">
                <ScrollReset />
                <div className="flex min-h-svh flex-col px-4 pt-6 pb-10 sm:px-6 lg:px-8">
                  {props.children}
                </div>
                <Footer />
              </ScrollArea>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
