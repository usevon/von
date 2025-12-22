"use client";

import Link from "next/link";
import { Button } from "@usevon/ui";

export default function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex select-none items-center justify-center">
        <span className="text-[12rem] font-bold leading-none text-foreground/20 drop-shadow-lg sm:text-[16rem]">
          4
        </span>
        <svg
          viewBox="-35 -5 100 210"
          className="h-[12rem] w-[6rem] text-foreground/20 drop-shadow-lg sm:h-[16rem] sm:w-[8rem]"
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M 50 0 L 50 38 A 14 14 0 1 1 50 66 L 50 150 Q 50 195, 10 195 Q -25 195, -25 155 Q -25 120, 10 120"
            stroke="currentColor"
          />
        </svg>
        <span className="text-[12rem] font-bold leading-none text-foreground/20 drop-shadow-lg sm:text-[16rem]">
          4
        </span>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          This one got away
        </h1>
        <p className="max-w-md text-muted-foreground">
          Von can deliver webhooks anywhere, but this page isn't one of the destinations.
        </p>
        <Button nativeButton={false} render={<Link href="/" />} className="mt-4">
          Go home
        </Button>
      </div>
    </div>
  );
}
