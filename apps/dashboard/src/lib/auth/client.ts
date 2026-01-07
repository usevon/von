"use client";

import { organizationClient, deviceAuthorizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { env } from "@/env";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_AUTH_URL,
  plugins: [organizationClient(), deviceAuthorizationClient()],
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  deleteUser,
  organization,
  device,
} = authClient;
