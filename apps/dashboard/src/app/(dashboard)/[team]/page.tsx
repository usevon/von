import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { DeleteAccount } from "@/components/delete-account";
import { Logout } from "@/components/logout";

type TeamPageProps = {
  params: Promise<{ team: string }>;
};

export default async function TeamPage(props: TeamPageProps) {
  const { team } = await props.params;
  const hdrs = await headers();

  // Get user's orgs and find the one with matching slug
  const orgs = await (auth.api as any).listOrganizations({
    headers: hdrs,
  }) as { id: string; slug: string; name: string }[] | null;

  const org = orgs?.find((o) => o.slug === team);

  return (
    <div className="flex flex-col items-center justify-center min-h-svh gap-4">
      <h1 className="text-2xl font-semibold">{org?.name}</h1>
      <p className="text-muted-foreground">Dashboard coming soon...</p>
      <div className="flex gap-2">
        <Logout />
        <DeleteAccount />
      </div>
    </div>
  );
}
