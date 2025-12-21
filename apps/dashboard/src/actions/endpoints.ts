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

export const toggleEndpoint = async (id: string, enabled: boolean) => {
  const headers = await getAuthHeaders();

  const { error } = await api.endpoints({ id }).patch(
    { enabled },
    { fetch: { headers } }
  );

  if (error) {
    throw new Error("Failed to toggle endpoint");
  }

  revalidatePath("/endpoints");
};

export const deleteEndpoint = async (id: string) => {
  const headers = await getAuthHeaders();

  const { error } = await api.endpoints({ id }).delete(null, {
    fetch: { headers },
  });

  if (error) {
    throw new Error("Failed to delete endpoint");
  }

  revalidatePath("/endpoints");
};

export const createEndpoint = async (
  input: NonNullable<Parameters<typeof api.endpoints.post>[0]>
) => {
  const headers = await getAuthHeaders();

  const { error } = await api.endpoints.post(input, {
    fetch: { headers },
  });

  if (error) {
    throw new Error("Failed to create endpoint");
  }

  revalidatePath("/endpoints");
};
