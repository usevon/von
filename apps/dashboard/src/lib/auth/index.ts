import { createAuth, type Session, type User } from "@usevon/auth";
import { db } from "@usevon/db";
import { headers } from "next/headers";
import { env } from "@/env";

const auth = createAuth(db, {
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.NEXT_PUBLIC_API_URL,
  apiKeySigningSecret: env.API_KEY_SIGNING_SECRET,
});

export async function getServerSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export type { Session, User };
