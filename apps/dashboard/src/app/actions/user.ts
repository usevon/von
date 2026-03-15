"use server";

import { headers } from "next/headers";
import { cache } from "react";

import { authClient } from "@/lib/auth/client";

type SessionResult = {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
  };
  session: {
    id: string;
    activeOrganizationId?: string | null;
  };
} | null;

type Organization = {
  id: string;
  name: string;
  slug: string;
};

export const getSession = cache(async (): Promise<SessionResult> => {
  const result = await authClient.getSession({
    fetchOptions: { headers: await headers() },
  });

  if (result.error || !result.data) {
    return null;
  }

  return {
    user: result.data.user,
    session: result.data.session,
  };
});

export async function listOrganizations(): Promise<Organization[]> {
  const result = await authClient.organization.list({
    fetchOptions: { headers: await headers() },
  });

  if (result.error || !result.data) {
    return [];
  }

  return result.data as Organization[];
}

export async function setActiveOrganization(
  organizationId: string
): Promise<boolean> {
  const result = await authClient.organization.setActive({
    organizationId,
    fetchOptions: { headers: await headers() },
  });

  return !result.error;
}
