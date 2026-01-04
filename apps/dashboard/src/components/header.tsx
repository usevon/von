"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { signOut, useSession } from "@/lib/auth/client";

export const Header = () => {
  const { data: session, isPending } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="flex items-center justify-between border-b px-5 py-3">
      <div className="flex items-center gap-5">
        <Link className="no-underline" href="/">
          <Image
            src="/brand/von-wordmark-black.svg"
            alt="Von"
            width={60}
            height={20}
            className="h-5 w-auto dark:hidden"
          />
          <Image
            src="/brand/von-wordmark-white.svg"
            alt="Von"
            width={60}
            height={20}
            className="hidden h-5 w-auto dark:block"
          />
        </Link>
        <Link
          className="text-muted-foreground no-underline hover:text-foreground"
          href="/test-auth"
        >
          Test Auth
        </Link>
        <Link
          className="text-muted-foreground no-underline hover:text-foreground"
          href="/webhooks"
        >
          Webhooks
        </Link>
        <Link
          className="text-muted-foreground no-underline hover:text-foreground"
          href="/endpoints"
        >
          Endpoints
        </Link>
        <Link
          className="text-muted-foreground no-underline hover:text-foreground"
          href="/inbound"
        >
          Inbound
        </Link>
      </div>
      <div>
        {!mounted || isPending ? (
          <span className="text-muted-foreground">Loading...</span>
        ) : session ? (
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">{session.user.email}</span>
            <button
              className="cursor-pointer text-foreground hover:text-muted-foreground"
              onClick={handleSignOut}
              type="button"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <span className="text-muted-foreground">Not logged in</span>
        )}
      </div>
    </nav>
  );
};
