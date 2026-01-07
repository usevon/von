import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Logo } from "@/components/logo";
import { auth } from "@/lib/auth";

type OnboardingLayoutProps = {
  children: React.ReactNode;
};

export default async function OnboardingLayout(props: OnboardingLayoutProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/login");
  }

  const orgs = await auth.api.listOrganizations({
    headers: await headers(),
  });

  if (orgs && orgs.length > 0) {
    redirect("/");
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center bg-background p-4">
      <div className="absolute left-0 top-0 m-4">
        <Logo />
      </div>
      <div className="w-full max-w-sm">{props.children}</div>
    </div>
  );
}
