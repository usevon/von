import Link from "next/link";

import { LoginForm } from "./form";

export const metadata = {
  title: "Sign in - Von",
};

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to your account to continue
        </p>
      </div>
      <LoginForm />
      <p className="text-muted-foreground text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link className="text-foreground underline-offset-4 hover:underline" href="/auth/signup">
          Sign up
        </Link>
      </p>
    </div>
  );
}
