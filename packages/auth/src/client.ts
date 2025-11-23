/**
 * Von Auth Client
 *
 * Client-side authentication for React applications.
 * Includes organization and API key client plugins.
 */
import { createAuthClient as createBetterAuthClient } from "better-auth/react"
import { organizationClient, apiKeyClient } from "better-auth/client/plugins"

export type CreateAuthClientOptions = {
  baseURL: string
}

export const createAuthClient = (options: CreateAuthClientOptions) => {
  return createBetterAuthClient({
    baseURL: options.baseURL,
    plugins: [organizationClient(), apiKeyClient()],
  })
}

export { organizationClient, apiKeyClient } from "better-auth/client/plugins"
