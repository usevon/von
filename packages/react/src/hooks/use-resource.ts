import useSWR from "swr";
import { useVonContext } from "@/provider";

export const createResource =
  <TResponse extends Record<string, unknown>, TItem, K extends string>(
    endpoint: string,
    dataKey: K & keyof TResponse
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
        const err = new Error(
          `Failed to fetch ${endpoint}: ${response.status}`
        );
        (err as Error & { status?: number }).status = response.status;
        throw err;
      }
      return (await response.json()) as TResponse;
    };

    const { data, error, isLoading, isValidating, mutate } = useSWR(
      `${apiUrl}/${endpoint}`,
      fetcher,
      { revalidateOnFocus: false }
    );

    return {
      [dataKey]: data ? (data[dataKey] as TItem[]) : [],
      nextCursor:
        (data as TResponse & { nextCursor?: string | null })?.nextCursor ??
        null,
      isLoading,
      isRefreshing: isValidating && !isLoading,
      error,
      refresh: () => mutate(),
      mutate,
    } as {
      [P in K]: TItem[];
    } & {
      nextCursor: string | null;
      isLoading: boolean;
      isRefreshing: boolean;
      error: Error | undefined;
      refresh: () => void;
      mutate: typeof mutate;
    };
  };
