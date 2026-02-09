"use client";

import { Button, ErrorIllustration } from "@usevon/ui";
import Image from "next/image";
import Link from "next/link";

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
              alt="Von"
              className="h-6 w-auto dark:hidden"
              height={24}
              src="/brand/von-wordmark-black.svg"
              width={80}
            />
            <Image
              alt="Von"
              className="hidden h-6 w-auto dark:block"
              height={24}
              src="/brand/von-wordmark-white.svg"
              width={80}
            />
          </Link>
          <div className="flex flex-1 flex-col items-center justify-center">
            <ErrorIllustration left="5" right="0" />
            <div className="mt-8 flex flex-col items-center gap-4 text-center">
              <h1 className="font-semibold text-2xl sm:text-3xl">
                Something went wrong
              </h1>
              <p className="max-w-md text-gray-500 text-lg">
                A critical error occurred.
              </p>
              <Button className="mt-4" onClick={props.reset} size="lg">
                Try again
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
