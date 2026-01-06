import { ResetPasswordForm } from "./form";

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
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="text-muted-foreground text-sm">
          Enter your new password below
        </p>
      </div>
      <ResetPasswordForm token={token ?? ""} />
    </div>
  );
}
