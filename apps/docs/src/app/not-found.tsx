"use client";

import Link from "next/link";

import { Button, ErrorIllustration } from "@usevon/ui";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <ErrorIllustration left="4" right="4" />
      <div className="mt-8 flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Page not found
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          The documentation you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Button render={<Link href="/" />} size="lg" className="mt-4">
          Back to docs
        </Button>
      </div>
    </div>
  );
}
