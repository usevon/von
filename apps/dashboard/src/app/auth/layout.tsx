import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Logo } from "@/components/logo";
import { auth } from "@/lib/auth";

type AuthLayoutProps = {
  children: React.ReactNode;
};

export default async function AuthLayout(props: AuthLayoutProps) {
  // try {
  //   const session = await auth.api.getSession({
  //     headers: await headers(),
  //   });

  //   if (session) {
  //     redirect("/");
  //   }
  // } catch {
  //   // Not authenticated, continue to auth pages
  // }

  return (
    <div className="relative flex min-h-svh items-center justify-center p-4">
      <div className="absolute left-0 top-0 m-4">
        <Logo />
      </div>
      <div className="w-full max-w-sm">{props.children}</div>
    </div>
  );
}
