import { headers } from "next/headers";
import { redirect } from "next/navigation";

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
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">{props.children}</div>
    </div>
  );
}
