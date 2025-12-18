import useSWR from "swr";
import { useVonContext } from "@/provider";

export const createResource =
  <TResponse extends Record<string, unknown>, TItem>(
    endpoint: string,
    dataKey: keyof TResponse
  ) =>
  () => {
    const { apiUrl, getCredentials } = useVonContext();

    const fetcher = async (url: string) => {
      const creds = await getCredentials();
      const response = await fetch(url, {
        headers:
          creds.type === "bearer"
            ? { Authorization: `Bearer ${creds.token}` }
            : undefined,
        credentials: creds.type === "cookie" ? "include" : undefined,
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch ${endpoint}`);
      }
      const data = (await response.json()) as TResponse;
      return (data[dataKey] as TItem[]) ?? [];
    };

    const { data, error, isLoading, isValidating, mutate } = useSWR(
      `${apiUrl}/${endpoint}`,
      fetcher,
      { revalidateOnFocus: false }
    );

    return {
      data: data ?? [],
      isLoading,
      isRefreshing: isValidating && !isLoading,
      error,
      refresh: () => mutate(),
      mutate,
    };
  };
