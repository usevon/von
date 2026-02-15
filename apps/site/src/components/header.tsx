import { Button } from "@usevon/ui";
import Link from "next/link";
import { docsUrl, urls } from "@/lib/urls";
import { LogoLink } from "./logo-link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-border border-b bg-background/80 backdrop-blur-lg">
      <div className="relative flex h-16 items-center justify-between px-8 sm:px-12">
        <LogoLink />

        <nav className="pointer-events-none absolute inset-0 hidden items-center justify-center gap-1 md:flex [&>*]:pointer-events-auto">
          <Button render={<Link href={docsUrl()} />} size="lg" variant="ghost">
            Docs
          </Button>
          <Button render={<Link href="/pricing" />} size="lg" variant="ghost">
            Pricing
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            className="max-sm:hidden"
            render={<Link href={urls.login} />}
            size="lg"
            variant="outline"
          >
            Log in
          </Button>
          <Button render={<Link href={urls.signup} />} size="lg">
            Get started
          </Button>
        </div>
      </div>
    </header>
  );
}
