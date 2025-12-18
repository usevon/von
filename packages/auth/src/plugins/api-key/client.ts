import type { BetterAuthClientPlugin } from "better-auth/client";
import type { apiKey } from "@/plugins/api-key";

export const apiKeyClient = () =>
  ({
    id: "api-key",
    $InferServerPlugin: {} as ReturnType<typeof apiKey>,
    pathMethods: {
      "/api-key/create": "POST",
      "/api-key/delete": "POST",
      "/api-key/update": "POST",
      "/api-key/delete-all-expired-api-keys": "POST",
    },
  }) satisfies BetterAuthClientPlugin;

export type ApiKeyClientPlugin = ReturnType<typeof apiKeyClient>;
