import { redirect } from "next/navigation";

import { getSession } from "@/app/actions/user";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default async function DashboardLayout(props: DashboardLayoutProps) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  // TODO: Add sidebar, header, etc.
  return (
    <div className="flex min-h-svh">
      <main className="flex-1">{props.children}</main>
    </div>
  );
}
