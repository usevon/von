/**
 * Von Auth Client
 *
 * Client-side authentication for React applications.
 * Includes organization and API key client plugins.
 */
import { createAuthClient as createBetterAuthClient } from "better-auth/react"
import { organizationClient } from "better-auth/client/plugins"
import { apiKeyClient } from "@/plugins/api-key/client"

export type CreateAuthClientOptions = {
  baseURL: string
}

export const createAuthClient = (options: CreateAuthClientOptions) => {
  return createBetterAuthClient({
    baseURL: options.baseURL,
    plugins: [organizationClient(), apiKeyClient()],
  })
}

export { organizationClient } from "better-auth/client/plugins"
export { apiKeyClient } from "@/plugins/api-key/client"
