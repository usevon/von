import { headers } from "next/headers";

import { ErrorIllustration } from "@usevon/ui";

import { Logo } from "@/components/logo";
import { Logout } from "@/components/logout";
import { auth } from "@/lib/auth";

type TeamLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ team: string }>;
};

export default async function TeamLayout(props: TeamLayoutProps) {
  const { team } = await props.params;
  const hdrs = await headers();

  // Get user's orgs and find the one with matching slug
  const orgs = await (auth.api as any).listOrganizations({
    headers: hdrs,
  }) as { id: string; slug: string; name: string }[] | null;

  const org = orgs?.find((o) => o.slug === team);

  // Get session for user info
  const session = await auth.api.getSession({
    headers: hdrs,
  });

  if (!org) {
    return (
      <div className="flex min-h-svh flex-col p-4">
        <Logo />
        <div className="flex flex-1 flex-col items-center justify-center">
          <ErrorIllustration left="4" right="4" />
          <div className="mt-8 flex flex-col items-center gap-4 text-center">
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Page not found
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              You are logged in as {session?.user?.email}
            </p>
            <Logout label="Sign in as a different user" loadingLabel="Signing out..." size="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (session?.session.activeOrganizationId !== org.id) {
    await auth.api.setActiveOrganization({
      body: { organizationId: org.id },
      headers: hdrs,
    });
  }

  return props.children;
}
