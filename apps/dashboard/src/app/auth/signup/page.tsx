import Link from "next/link";

import { SignupForm } from "./form";

export const metadata = {
  title: "Sign up - Von",
};

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-muted-foreground text-sm">
          Get started with Von in minutes
        </p>
      </div>
      <SignupForm />
      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link className="text-foreground underline-offset-4 hover:underline" href="/auth/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
