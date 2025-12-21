import { redirect } from "next/navigation";
import { InboundManager } from "@/components/inbound-manager";
import { getServerSession } from "@/lib/auth";

export default async function InboundPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/test-auth");
  }

  return <InboundManager session={session} />;
}
