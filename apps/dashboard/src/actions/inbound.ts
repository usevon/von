"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { api } from "@/lib/api";

const getAuthHeaders = async () => {
  const cookieStore = await cookies();
  return {
    cookie: cookieStore.toString(),
  };
};

export const toggleInbound = async (id: string, enabled: boolean) => {
  const headers = await getAuthHeaders();

  const { error } = await api.inbound({ id }).patch(
    { enabled },
    { fetch: { headers } }
  );

  if (error) {
    throw new Error("Failed to toggle inbound endpoint");
  }

  revalidatePath("/inbound");
};

export const deleteInbound = async (id: string) => {
  const headers = await getAuthHeaders();

  const { error } = await api.inbound({ id }).delete(null, {
    fetch: { headers },
  });

  if (error) {
    throw new Error("Failed to delete inbound endpoint");
  }

  revalidatePath("/inbound");
};

export const createInbound = async (
  input: NonNullable<Parameters<typeof api.inbound.post>[0]>
) => {
  const headers = await getAuthHeaders();

  const { error } = await api.inbound.post(input, {
    fetch: { headers },
  });

  if (error) {
    throw new Error("Failed to create inbound endpoint");
  }

  revalidatePath("/inbound");
};
