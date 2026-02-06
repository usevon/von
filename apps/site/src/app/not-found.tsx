"use client";

import Link from "next/link";

import { Button, ErrorIllustration } from "@usevon/ui";

export default function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <ErrorIllustration left="4" right="4" />
      <div className="mt-8 flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          This one got away
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Von can deliver webhooks anywhere, but this page isn&apos;t one of the destinations.
        </p>
        <Button render={<Link href="/" />} size="lg" className="mt-4">
          Go home
        </Button>
      </div>
    </div>
  );
}
