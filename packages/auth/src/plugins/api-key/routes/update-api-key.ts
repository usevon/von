import {
  APIError,
  createAuthEndpoint,
  getSessionFromCtx,
} from "better-auth/api";
import { z } from "zod";
import { ERROR_CODES } from "@/plugins/api-key";
import { setApiKey } from "@/plugins/api-key/adapter";
import { VALID_SCOPES } from "@/plugins/api-key/scopes";
import type { ApiKey, ResolvedApiKeyOptions } from "@/plugins/api-key/types";

const API_KEY_TABLE_NAME = "apikey";

export function updateApiKey({
  opts,
  maxNameLength,
}: {
  opts: ResolvedApiKeyOptions;
  maxNameLength: number;
}) {
  return createAuthEndpoint(
    "/api-key/update",
    {
      method: "POST",
      body: z.object({
        keyId: z.string(),
        name: z.string().min(1).max(maxNameLength).optional(),
        enabled: z.boolean().optional(),
        scopes: z.array(z.string()).optional(),
      }),
    },
    async (ctx) => {
      const session = await getSessionFromCtx(ctx);
      if (!session) {
        throw new APIError("UNAUTHORIZED", {
          message: ERROR_CODES.UNAUTHORIZED_SESSION,
        });
      }

      const { keyId, name, enabled, scopes } = ctx.body;

      const apiKey = await ctx.context.adapter.findOne<ApiKey>({
        model: API_KEY_TABLE_NAME,
        where: [{ field: "id", value: keyId }],
      });

      if (!apiKey) {
        throw new APIError("NOT_FOUND", {
          message: ERROR_CODES.KEY_NOT_FOUND,
        });
      }

      if (apiKey.userId !== session.user.id) {
        throw new APIError("FORBIDDEN", {
          message: "Access denied",
        });
      }

      if (scopes) {
        const validScopeSet = new Set<string>(VALID_SCOPES);
        const invalid = scopes.filter((s) => !validScopeSet.has(s));
        if (invalid.length > 0) {
          throw new APIError("BAD_REQUEST", {
            message: `Invalid scopes: ${invalid.join(", ")}`,
          });
        }
      }

      const update: Partial<ApiKey> = {
        updatedAt: new Date(),
      };

      if (name !== undefined) {
        update.name = name;
      }
      if (enabled !== undefined) {
        update.enabled = enabled;
      }
      if (scopes !== undefined) {
        update.scopes = JSON.stringify(scopes);
      }

      const updated = await ctx.context.adapter.update<ApiKey>({
        model: API_KEY_TABLE_NAME,
        where: [{ field: "id", value: keyId }],
        update,
      });

      if (!updated) {
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: "Failed to update API key",
        });
      }

      const completeApiKey: ApiKey = { ...apiKey, ...update };
      await setApiKey(ctx as never, completeApiKey, opts);

      const { key: _, ...safeKey } = completeApiKey;
      return ctx.json(safeKey);
    }
  );
}
