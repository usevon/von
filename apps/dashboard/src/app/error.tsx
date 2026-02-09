"use client";

import { Button, ErrorIllustration } from "@usevon/ui";
import { useEffect } from "react";

import { Logo } from "@/components/logo";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error(props: ErrorProps) {
  useEffect(() => {
    console.error(props.error);
  }, [props.error]);

  return (
    <div className="flex min-h-svh flex-col p-4">
      <Logo />
      <div className="flex flex-1 flex-col items-center justify-center">
        <ErrorIllustration left="5" right="0" />
        <div className="mt-8 flex flex-col items-center gap-4 text-center">
          <h1 className="font-semibold text-2xl text-foreground sm:text-3xl">
            Something went wrong
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            An unexpected error occurred.
          </p>
          <Button className="mt-4" onClick={props.reset} size="lg">
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
