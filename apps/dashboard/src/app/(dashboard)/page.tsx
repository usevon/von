import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/login");
  }

  const orgs = await (auth.api as any).listOrganizations({
    headers: await headers(),
  }) as { id: string; slug: string }[] | null;

  if (!orgs || orgs.length === 0) {
    redirect("/onboarding");
  }

  // If user has active org, redirect to /{slug}
  if (session.session.activeOrganizationId) {
    const activeOrg = orgs.find((o) => o.id === session.session.activeOrganizationId);
    if (activeOrg) {
      redirect(`/${activeOrg.slug}`);
    }
  }

  // Fallback to first org
  redirect(`/${orgs[0].slug}`);
}
