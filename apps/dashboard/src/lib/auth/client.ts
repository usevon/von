"use client";

import { clearBearerToken, createAuthClient } from "@usevon/auth/client";
import { env } from "@/env";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_API_URL,
});

const originalSignOut = authClient.signOut;
const originalDeleteUser = authClient.deleteUser;

export const signOut = () => {
  clearBearerToken();
  return originalSignOut();
};

export const deleteUser = () => {
  clearBearerToken();
  return originalDeleteUser();
};

export const { useSession, signIn, signUp, organization, apiKey, device } =
  authClient;
