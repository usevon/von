import { redirect } from "next/navigation";
import { WebhooksManager } from "@/components/webhooks-manager";
import { getServerSession } from "@/lib/auth";

export default async function WebhooksPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/test-auth");
  }

  return <WebhooksManager session={session} />;
}
