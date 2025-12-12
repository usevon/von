import type { ResolvedApiKeyOptions } from "../types"
import { createApiKey } from "./create-api-key"
import { deleteApiKey } from "./delete-api-key"
import { getApiKey } from "./get-api-key"
import { listApiKeys } from "./list-api-keys"
import { updateApiKey } from "./update-api-key"
import { verifyApiKey } from "./verify-api-key"

export function createApiKeyRoutes({
  keyGenerator,
  opts,
  keyLength,
  startLength,
  maxNameLength,
  maxExpiresDays,
}: {
  keyGenerator: (environment: string) => Promise<string>
  opts: ResolvedApiKeyOptions
  keyLength: number
  startLength: number
  maxNameLength: number
  maxExpiresDays: number
}) {
  return {
    createApiKey: createApiKey({ keyGenerator, opts, startLength, maxNameLength, maxExpiresDays }),
    verifyApiKey: verifyApiKey({ opts, keyLength }),
    getApiKey: getApiKey(),
    updateApiKey: updateApiKey({ opts, maxNameLength }),
    deleteApiKey: deleteApiKey({ opts }),
    listApiKeys: listApiKeys(),
  }
}
