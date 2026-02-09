import { redirect } from "next/navigation";
import { getSession, listOrganizations } from "@/app/actions/user";
import { Logo } from "@/components/logo";

type OnboardingLayoutProps = {
  children: React.ReactNode;
};

export default async function OnboardingLayout(props: OnboardingLayoutProps) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const orgs = await listOrganizations();

  if (orgs.length > 0) {
    redirect("/");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <div className="mx-auto flex h-21 w-full max-w-7xl items-center px-6 lg:px-10">
        <Logo />
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-4 lg:px-10">
        <div className="w-full max-w-sm">{props.children}</div>
      </div>
    </div>
  );
}
