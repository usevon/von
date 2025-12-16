import { useFetch } from "@/hooks/useFetch"

export const createResource = <TResponse extends Record<string, unknown>, TItem>(
  endpoint: string,
  dataKey: keyof TResponse
) => {
  return () => {
    const result = useFetch<TResponse, TItem[]>({
      endpoint,
      parseData: (data) => (data[dataKey] as TItem[]) ?? [],
    })

    return {
      data: result.data ?? [],
      isLoading: result.isLoading,
      isRefreshing: result.isRefreshing,
      error: result.error,
      refresh: result.refresh,
      mutate: result.mutate,
    }
  }
}
