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
          viewBox="-100 -20 200 320"
          className="h-[12rem] w-[8rem] text-foreground opacity-20 sm:h-[16rem] sm:w-[10rem]"
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="50" cy="52" r="14" />
          <path d="M50 0v38m0 28v86c0 62-58 92-108 54-36-36-18-94 40-104" />
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
          Von can deliver webhooks anywhere, but this page isn&apos;t one of the destinations.
        </p>
        <Button nativeButton={false} render={<Link href="/" />} className="mt-4">
          Go home
        </Button>
      </div>
    </div>
  );
}
