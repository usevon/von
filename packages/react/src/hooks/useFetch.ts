import useSWR from "swr"
import type { SWRConfiguration } from "swr"
import { useVonContext } from "../provider"

type UseFetchOptions<T> = {
  endpoint: string
  parseData: (data: unknown) => T
  swrConfig?: SWRConfiguration
}

export const useFetch = <T>(options: UseFetchOptions<T>) => {
  const { apiUrl, getCredentials } = useVonContext()

  const fetcher = async (url: string) => {
    const creds = await getCredentials()
    const response = await fetch(url, {
      headers: creds.type === "bearer"
        ? { Authorization: `Bearer ${creds.token}` }
        : undefined,
      credentials: creds.type === "cookie" ? "include" : undefined,
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch ${options.endpoint}`)
    }
    return options.parseData(await response.json())
  }

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    `${apiUrl}/${options.endpoint}`,
    fetcher,
    {
      revalidateOnFocus: false,
      ...options.swrConfig,
    }
  )

  return {
    data: data ?? null,
    error,
    isLoading,
    isRefreshing: isValidating && !isLoading,
    refresh: () => mutate(),
    mutate,
  }
}
