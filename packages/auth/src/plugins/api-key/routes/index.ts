import type { ResolvedApiKeyOptions } from "@/plugins/api-key/types"
import { createApiKey } from "@/plugins/api-key/routes/create-api-key"
import { deleteApiKey } from "@/plugins/api-key/routes/delete-api-key"
import { getApiKey } from "@/plugins/api-key/routes/get-api-key"
import { listApiKeys } from "@/plugins/api-key/routes/list-api-keys"
import { updateApiKey } from "@/plugins/api-key/routes/update-api-key"
import { verifyApiKey } from "@/plugins/api-key/routes/verify-api-key"

export function createApiKeyRoutes({
  keyGenerator,
  opts,
  keyLength,
  startLength,
  maxNameLength,
  maxExpiresDays,
  maxKeysPerUser,
}: {
  keyGenerator: (environment: string) => Promise<string>
  opts: ResolvedApiKeyOptions
  keyLength: number
  startLength: number
  maxNameLength: number
  maxExpiresDays: number
  maxKeysPerUser: number
}) {
  return {
    createApiKey: createApiKey({ keyGenerator, opts, startLength, maxNameLength, maxExpiresDays, maxKeysPerUser }),
    verifyApiKey: verifyApiKey({ opts, keyLength }),
    getApiKey: getApiKey(),
    updateApiKey: updateApiKey({ opts, maxNameLength }),
    deleteApiKey: deleteApiKey({ opts }),
    listApiKeys: listApiKeys(),
  }
}
