import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Logo } from "@/components/logo";
import { auth } from "@/lib/auth";

type AuthLayoutProps = {
  children: React.ReactNode;
};

export default async function AuthLayout(props: AuthLayoutProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // If already logged in, redirect is handled by middleware
  if (session) {
    redirect("/");
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center p-4">
      <div className="absolute left-0 top-0 m-4">
        <Logo />
      </div>
      <div className="w-full max-w-sm">{props.children}</div>
    </div>
  );
}
