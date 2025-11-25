import type { PredefinedApiKeyOptions } from "../types"
import { createApiKey } from "./create-api-key"
import { deleteApiKey } from "./delete-api-key"
import { getApiKey } from "./get-api-key"
import { listApiKeys } from "./list-api-keys"
import { updateApiKey } from "./update-api-key"
import { verifyApiKey } from "./verify-api-key"

export function createApiKeyRoutes({
  keyGenerator,
  opts,
}: {
  keyGenerator: (options: {
    length: number
    prefix: string | undefined
    environment?: string
  }) => Promise<string> | string
  opts: PredefinedApiKeyOptions
}) {
  return {
    createApiKey: createApiKey({ keyGenerator, opts }),
    verifyApiKey: verifyApiKey({ opts }),
    getApiKey: getApiKey({ opts }),
    updateApiKey: updateApiKey({ opts }),
    deleteApiKey: deleteApiKey({ opts }),
    listApiKeys: listApiKeys({ opts }),
  }
}
