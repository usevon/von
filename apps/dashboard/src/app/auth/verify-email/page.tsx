import Link from "next/link";

import { ResendVerification } from "@/app/auth/verify-email/form";

export const metadata = {
  title: "Verify your email - Von",
};

type VerifyEmailPageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function VerifyEmailPage(props: VerifyEmailPageProps) {
  const searchParams = await props.searchParams;
  const email = searchParams.email;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">
          Check your email
        </h1>
        <p className="text-muted-foreground text-sm">
          {email ? (
            <>
              We sent a verification link to{" "}
              <strong className="text-foreground">{email}</strong>
            </>
          ) : (
            "We sent you a verification link"
          )}
        </p>
      </div>
      <ResendVerification email={email} />
      <p className="text-muted-foreground text-sm">
        Already verified?{" "}
        <Link className="text-foreground underline" href="/auth/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
