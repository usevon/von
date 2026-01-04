import type { Metadata } from "next";
import { Familjen_Grotesk } from "next/font/google";

import "../index.css";
import { Footer } from "@/components/footer";
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
          <div className="flex min-h-svh flex-col">
            <Header />
            <main className="flex flex-1 flex-col">{props.children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
