import {
  APIError,
  createAuthEndpoint,
  getSessionFromCtx,
} from "better-auth/api";
import { z } from "zod";
import { API_KEY_TABLE_NAME, ERROR_CODES } from "@/plugins/api-key";
import { deleteApiKeyFromSecondaryStorage } from "@/plugins/api-key/adapter";
import type { ApiKey, ResolvedApiKeyOptions } from "@/plugins/api-key/types";

export function deleteApiKey({ opts }: { opts: ResolvedApiKeyOptions }) {
  return createAuthEndpoint(
    "/api-key/delete",
    {
      method: "POST",
      body: z.object({
        keyId: z.string(),
      }),
    },
    async (ctx) => {
      const session = await getSessionFromCtx(ctx);
      if (!session) {
        throw new APIError("UNAUTHORIZED", {
          message: ERROR_CODES.UNAUTHORIZED_SESSION,
        });
      }

      const apiKey = await ctx.context.adapter.findOne<ApiKey>({
        model: API_KEY_TABLE_NAME,
        where: [{ field: "id", value: ctx.body.keyId }],
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

      if (apiKey.organizationId) {
        const membership = await ctx.context.adapter.findOne<{ id: string }>({
          model: "member",
          where: [
            { field: "userId", value: session.user.id },
            { field: "organizationId", value: apiKey.organizationId },
          ],
        });
        if (!membership) {
          throw new APIError("FORBIDDEN", {
            message: "Not a member of this organization",
          });
        }
      }

      await deleteApiKeyFromSecondaryStorage(ctx as never, apiKey, opts);

      await ctx.context.adapter.delete({
        model: API_KEY_TABLE_NAME,
        where: [{ field: "id", value: ctx.body.keyId }],
      });

      if (opts.apiKeyHooks?.afterDelete) {
        const { key: _, ...payload } = apiKey;
        await opts.apiKeyHooks.afterDelete(payload);
      }

      return ctx.json({ success: true });
    }
  );
}
