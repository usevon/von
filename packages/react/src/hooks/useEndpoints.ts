import { createResource } from "@/hooks/useResource"

export type Endpoint = {
  id: string
  url: string
  description: string | null
  secret: string
  enabled: boolean
  retryCount: number
  timeoutMs: number
  createdAt: string
  updatedAt: string
}

type EndpointsResponse = { endpoints: Endpoint[] }

export const useEndpoints = createResource<EndpointsResponse, Endpoint>("endpoints", "endpoints")
