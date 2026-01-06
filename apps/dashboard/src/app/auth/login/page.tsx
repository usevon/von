import Link from "next/link";

import { Separator } from "@usevon/ui";

import { OAuthButtons } from "@/components/auth/oauth";
import { getSafeRedirect } from "@/lib/auth";
import { LoginForm } from "@/app/auth/login/form";

export const metadata = {
  title: "Sign in - Von",
};

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function LoginPage(props: LoginPageProps) {
  const searchParams = await props.searchParams;
  const redirectTo = getSafeRedirect(searchParams.redirect);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">Sign in to your account</p>
      </div>
      <OAuthButtons />
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
