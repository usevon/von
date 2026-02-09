import Link from "next/link";
import { ResetPasswordForm } from "@/app/auth/reset-password/form";

export const metadata = {
  title: "Reset password - Von",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage(props: ResetPasswordPageProps) {
  const searchParams = await props.searchParams;
  const { token } = searchParams;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">
          Reset password
        </h1>
        <p className="text-muted-foreground text-sm">
          Enter your new password below
        </p>
      </div>
      <ResetPasswordForm token={token ?? ""} />
      <p className="text-muted-foreground text-sm">
        Back to{" "}
        <Link className="text-foreground underline" href="/auth/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
