import { Separator } from "@usevon/ui";
import Link from "next/link";
import { LoginForm } from "@/app/auth/login/form";
import { OAuthButtons } from "@/components/auth/oauth";

export const metadata = {
  title: "Sign in - Von",
};

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

/**
 * Validates and sanitizes a redirect URL to prevent open redirect attacks.
 * Only allows internal paths (starting with / but not //).
 */
export function getSafeRedirect(url: string | undefined): string {
  if (!url) {
    return "/";
  }
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }
  return "/";
}

export default async function LoginPage(props: LoginPageProps) {
  const searchParams = await props.searchParams;
  const redirectTo = getSafeRedirect(searchParams.redirect);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">Sign in to your account</p>
      </div>
      <OAuthButtons mode="login" redirectTo={redirectTo} />
      <div className="flex items-center gap-2">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">or</span>
        <Separator className="flex-1" />
      </div>
      <LoginForm redirectTo={redirectTo} />
      <p className="text-muted-foreground text-sm">
        Don&apos;t have an account?{" "}
        <Link
          className="text-foreground underline"
          href={{
            pathname: "/auth/signup",
            query: redirectTo !== "/" ? { redirect: redirectTo } : undefined,
          }}
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
