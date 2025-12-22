import type { Metadata } from "next";
import { Familjen_Grotesk } from "next/font/google";

import "@/index.css";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";

const familjen = Familjen_Grotesk({
  variable: "--font-familjen",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Von Dashboard",
  description: "Webhook infrastructure management",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout(props: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${familjen.variable} antialiased`}>
        <Providers>
          <div className="grid grid-rows-[auto_1fr] h-svh">
            <Header />
            {props.children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
