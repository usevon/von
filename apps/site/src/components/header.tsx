import { Button } from "@usevon/ui";
import Link from "next/link";
import { docsUrl, urls } from "@/lib/urls";
import { LogoLink } from "./logo-link";

const navItems = [
  { label: "Docs", href: docsUrl() },
  { label: "Pricing", href: urls.signupPro },
];

const frameClass = "mx-auto w-full max-w-[76rem]";

export function Header() {
  return (
    <header className="border-border border-b">
      <div className={frameClass}>
        <div className="relative flex h-16 items-center justify-between border-border border-x px-7 sm:px-11">
          <LogoLink />

          <nav className="pointer-events-none absolute inset-0 hidden items-center justify-center gap-1 md:flex [&>*]:pointer-events-auto">
            {navItems.map((item) => (
              <Button
                className="text-muted-foreground"
                key={item.label}
                render={<Link href={item.href} />}
                size="xl"
                variant="ghost"
              >
                {item.label}
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              className="hidden text-muted-foreground sm:inline-flex"
              render={<Link href={urls.login} />}
              size="xl"
              variant="ghost"
            >
              Log in
            </Button>
            <Button
              render={<Link href={urls.signup} />}
              size="xl"
            >
              Sign up
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
