import { redirect } from "next/navigation";
import { EndpointsManager } from "@/components/endpoints-manager";
import { getServerSession } from "@/lib/auth";

export default async function EndpointsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/test-auth");
  }

  if (!session.session.activeOrganizationId) {
    return <EndpointsManager session={session} needsOrganization />;
  }

  return <EndpointsManager session={session} />;
}
