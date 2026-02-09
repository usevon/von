import { ErrorIllustration } from "@usevon/ui";
import {
  getSession,
  listOrganizations,
  setActiveOrganization,
} from "@/app/actions/user";
import { Logo } from "@/components/logo";
import { Logout } from "@/components/logout";

type TeamLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ team: string }>;
};

export default async function TeamLayout(props: TeamLayoutProps) {
  const { team } = await props.params;

  const orgs = await listOrganizations();
  const org = orgs.find((o) => o.slug === team);

  const session = await getSession();

  if (!org) {
    return (
      <div className="flex min-h-svh flex-col p-4">
        <Logo />
        <div className="flex flex-1 flex-col items-center justify-center">
          <ErrorIllustration left="4" right="4" />
          <div className="mt-8 flex flex-col items-center gap-4 text-center">
            <h1 className="font-semibold text-2xl text-foreground sm:text-3xl">
              Page not found
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              You are logged in as {session?.user?.email}
            </p>
            <Logout
              label="Sign in as a different user"
              loadingLabel="Signing out..."
              size="lg"
            />
          </div>
        </div>
      </div>
    );
  }

  if (session?.session.activeOrganizationId !== org.id) {
    await setActiveOrganization(org.id);
  }

  return props.children;
}
