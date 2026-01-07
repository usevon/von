"use client";

import {
  createAuthClient,
  deviceAuthorizationClient,
  organizationClient,
} from "@usevon/auth/client";

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
