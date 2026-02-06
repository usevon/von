import Link from "next/link";

import { Separator } from "@usevon/ui";

import { OAuthButtons } from "@/components/auth/oauth";
import { SignupForm } from "@/app/auth/signup/form";

export const metadata = {
  title: "Sign up - Von",
};

type SignupPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

/**
 * Validates and sanitizes a redirect URL to prevent open redirect attacks.
 * Only allows internal paths (starting with / but not //).
 */
export function getSafeRedirect(url: string | undefined): string {
  if (!url) return "/";
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }
  return "/";
}

export default async function SignupPage(props: SignupPageProps) {
  const searchParams = await props.searchParams;
  const redirectTo = getSafeRedirect(searchParams.redirect);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-muted-foreground text-sm">Get started with Von</p>
      </div>
      <OAuthButtons redirectTo={redirectTo} mode="signup" />
      <div className="flex items-center gap-2">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">or</span>
        <Separator className="flex-1" />
      </div>
      <SignupForm redirectTo={redirectTo} />
      <p className="text-muted-foreground text-sm">
        Already have an account?{" "}
        <Link
          className="text-foreground underline"
          href={{
            pathname: "/auth/login",
            query: redirectTo !== "/" ? { redirect: redirectTo } : undefined,
          }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
