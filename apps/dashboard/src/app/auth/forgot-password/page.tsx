import Link from "next/link";

import { ForgotPasswordForm } from "./form";

export const metadata = {
  title: "Forgot password - Von",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="text-muted-foreground text-sm">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="text-muted-foreground text-center text-sm">
        Remember your password?{" "}
        <Link className="text-foreground underline-offset-4 hover:underline" href="/auth/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
