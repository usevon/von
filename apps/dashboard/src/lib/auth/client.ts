"use client";

import { createAuthClient } from "@usevon/auth/client";

export const authClient = createAuthClient();

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  deleteUser,
  organization,
  apiKey,
  device,
} = authClient;
