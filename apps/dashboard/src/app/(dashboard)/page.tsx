import { redirect } from "next/navigation";

import { getSession, listOrganizations } from "@/app/actions/user";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const orgs = await listOrganizations();

  if (orgs.length === 0) {
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
