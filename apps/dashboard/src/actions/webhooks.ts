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

export const sendWebhook = async (
  input: NonNullable<Parameters<typeof api.webhooks.post>[0]>
) => {
  const headers = await getAuthHeaders();

  const { error } = await api.webhooks.post(input, {
    fetch: { headers },
  });

  if (error) {
    throw new Error("Failed to send webhook");
  }

  revalidatePath("/webhooks");
};
