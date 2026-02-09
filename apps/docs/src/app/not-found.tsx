"use client";

import { Button, ErrorIllustration } from "@usevon/ui";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <ErrorIllustration left="4" right="4" />
      <div className="mt-8 flex flex-col items-center gap-4 text-center">
        <h1 className="font-semibold text-2xl text-foreground sm:text-3xl">
          Page not found
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          The documentation you&apos;re looking for doesn&apos;t exist or may
          have moved.
        </p>
        <Button className="mt-4" render={<Link href="/" />} size="lg">
          Back to docs
        </Button>
      </div>
    </div>
  );
}
