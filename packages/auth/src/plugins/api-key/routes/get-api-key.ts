import {
  APIError,
  createAuthEndpoint,
  getSessionFromCtx,
} from "better-auth/api";
import { z } from "zod";
import { API_KEY_TABLE_NAME, ERROR_CODES } from "@/plugins/api-key";
import type { ApiKey } from "@/plugins/api-key/types";

export function getApiKey() {
  return createAuthEndpoint(
    "/api-key/get",
    {
      method: "GET",
      query: z.object({
        id: z.string(),
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
        where: [{ field: "id", value: ctx.query.id }],
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

      const { key: _, ...safeKey } = apiKey;
      return ctx.json(safeKey);
    }
  );
}
