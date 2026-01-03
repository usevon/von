import type { Metadata } from "next";
import { Familjen_Grotesk } from "next/font/google";
import { ScrollArea } from "@usevon/ui";

import "@/index.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { Footer } from "@/components/footer";

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
            <Header />
            <Sidebar />
            <main className="h-[calc(100svh-3.5rem)] lg:ml-64">
              <ScrollArea className="h-full">
                <div className="flex min-h-[calc(100svh-3.5rem)] flex-col px-4 pt-6 pb-10 sm:px-6 lg:px-8">
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
