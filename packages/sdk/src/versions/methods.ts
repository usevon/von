import type { Von } from "@/client"
import { createCrudMethods } from "@/factory"
import type {
  CreateVersionParams,
  UpdateVersionParams,
  WebhookVersion,
  VersionsResponse,
} from "@/versions/types"

export const versionsMethods = (client: Von) =>
  createCrudMethods<CreateVersionParams, UpdateVersionParams, WebhookVersion, VersionsResponse>(
    client,
    "versions"
  )
