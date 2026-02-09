"use client";

import { Button, ErrorIllustration } from "@usevon/ui";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError(props: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
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
      </body>
    </html>
  );
}
