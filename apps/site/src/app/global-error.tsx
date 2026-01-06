"use client";

import Image from "next/image";
import Link from "next/link";

import { Button, ErrorIllustration } from "@usevon/ui";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError(props: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-screen flex-col p-4">
          <Link href="/">
            <Image
              src="/brand/von-wordmark-black.svg"
              alt="Von"
              width={80}
              height={24}
              className="h-6 w-auto dark:hidden"
            />
            <Image
              src="/brand/von-wordmark-white.svg"
              alt="Von"
              width={80}
              height={24}
              className="hidden h-6 w-auto dark:block"
            />
          </Link>
          <div className="flex flex-1 flex-col items-center justify-center">
            <ErrorIllustration left="5" right="0" />
            <div className="mt-8 flex flex-col items-center gap-4 text-center">
              <h1 className="text-2xl font-semibold sm:text-3xl">
                Something went wrong
              </h1>
              <p className="max-w-md text-lg text-gray-500">
                A critical error occurred.
              </p>
              <Button onClick={props.reset} size="lg" className="mt-4">
                Try again
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
