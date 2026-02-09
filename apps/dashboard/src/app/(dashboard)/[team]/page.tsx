import { listOrganizations } from "@/app/actions/user";
import { DeleteAccount } from "@/components/delete-account";
import { Logout } from "@/components/logout";

type TeamPageProps = {
  params: Promise<{ team: string }>;
};

export default async function TeamPage(props: TeamPageProps) {
  const { team } = await props.params;

  const orgs = await listOrganizations();
  const org = orgs.find((o) => o.slug === team);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="font-semibold text-2xl">{org?.name}</h1>
      <p className="text-muted-foreground">Dashboard coming soon...</p>
      <div className="flex gap-2">
        <Logout />
        <DeleteAccount />
      </div>
    </div>
  );
}
