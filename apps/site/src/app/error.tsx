"use client";

import { useEffect } from "react";

import { Button, ErrorIllustration } from "@usevon/ui";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error(props: ErrorProps) {
  useEffect(() => {
    console.error(props.error);
  }, [props.error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <ErrorIllustration left="5" right="0" />
      <div className="mt-8 flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Something went wrong
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          An unexpected error occurred.
        </p>
        <Button onClick={props.reset} size="lg" className="mt-4">
          Try again
        </Button>
      </div>
    </div>
  );
}
