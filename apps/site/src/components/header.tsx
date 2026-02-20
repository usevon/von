import { Button } from "@usevon/ui";
import Link from "next/link";
import { docsUrl, urls } from "@/lib/urls";
import { LogoLink } from "./logo-link";
import { MobileNavigation } from "./mobile-navigation";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-border/80 border-b bg-[color-mix(in_srgb,var(--color-background),var(--color-foreground)_3%)] backdrop-blur-xl dark:bg-[color-mix(in_srgb,var(--color-background),white_4%)]">
      <div className="relative flex h-16 items-center justify-between px-8 sm:px-12">
        <LogoLink />

        <nav className="pointer-events-none absolute inset-0 hidden items-center justify-center gap-1 *:pointer-events-auto lg:flex">
          <Button render={<Link href={docsUrl()} />} size="lg" variant="ghost">
            Docs
          </Button>
          <Button render={<Link href="/pricing" />} size="lg" variant="ghost">
            Pricing
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            className="max-lg:hidden"
            render={<Link href={urls.login} />}
            size="lg"
            variant="outline"
          >
            Log in
          </Button>
          <Button
            className="max-lg:hidden"
            render={<Link href={urls.signup} />}
            size="lg"
          >
            Get started
          </Button>
          <MobileNavigation />
        </div>
      </div>
    </header>
  );
}
