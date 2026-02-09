"use client";

import { Button, ErrorIllustration } from "@usevon/ui";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <ErrorIllustration left="4" right="4" />
      <div className="mt-8 flex flex-col items-center gap-4 text-center">
        <h1 className="font-semibold text-2xl text-foreground sm:text-3xl">
          This one got away
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Von can deliver webhooks anywhere, but this page isn&apos;t one of the
          destinations.
        </p>
        <Button className="mt-4" render={<Link href="/" />} size="lg">
          Go home
        </Button>
      </div>
    </div>
  );
}
