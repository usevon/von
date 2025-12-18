import type { Von } from "@/client";
import { createCrudMethods } from "@/factory";
import type {
  CreateVersionParams,
  UpdateVersionParams,
  VersionsResponse,
  WebhookVersion,
} from "@/versions/types";

export const versionsMethods = (client: Von) =>
  createCrudMethods<
    CreateVersionParams,
    UpdateVersionParams,
    WebhookVersion,
    VersionsResponse
  >(client, "versions");
