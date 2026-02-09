import Link from "next/link";

import { ForgotPasswordForm } from "@/app/auth/forgot-password/form";

export const metadata = {
  title: "Forgot password - Von",
};

type ForgotPasswordPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function ForgotPasswordPage(
  props: ForgotPasswordPageProps
) {
  const searchParams = await props.searchParams;
  const redirectTo = searchParams.redirect ?? "/";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">
          Forgot password?
        </h1>
        <p className="text-muted-foreground text-sm">
          We&apos;ll send you a reset link
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="text-muted-foreground text-sm">
        Remember your password?{" "}
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
