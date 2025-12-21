import { TestAuthManager } from "@/components/test-auth-manager";
import { getServerSession } from "@/lib/auth";

export default async function TestAuthPage() {
  const session = await getServerSession();

  return <TestAuthManager session={session} />;
}
