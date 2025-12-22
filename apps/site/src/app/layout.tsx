import type { Metadata } from "next";
import { Familjen_Grotesk } from "next/font/google";

import "../index.css";
import { Header } from "@/components/header";
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
        <Providers>
          <div className="grid grid-rows-[auto_1fr] min-h-svh">
            <Header />
            <main>{props.children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
