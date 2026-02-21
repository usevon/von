import {
  APIError,
  createAuthEndpoint,
  getSessionFromCtx,
} from "better-auth/api";
import { z } from "zod";
import { API_KEY_TABLE_NAME, ERROR_CODES } from "@/plugins/api-key";
import type { ApiKey } from "@/plugins/api-key/types";

export function listApiKeys() {
  return createAuthEndpoint(
    "/api-key/list",
    {
      method: "GET",
      query: z.object({
        organizationId: z.string().optional(),
      }),
    },
    async (ctx) => {
      const session = await getSessionFromCtx(ctx);
      if (!session) {
        throw new APIError("UNAUTHORIZED", {
          message: ERROR_CODES.UNAUTHORIZED_SESSION,
        });
      }

      const where: Array<{ field: string; value: string }> = [
        { field: "userId", value: session.user.id },
      ];

      if (ctx.query.organizationId) {
        where.push({
          field: "organizationId",
          value: ctx.query.organizationId,
        });
      }

      const keys = await ctx.context.adapter.findMany<ApiKey>({
        model: API_KEY_TABLE_NAME,
        where,
        sortBy: { field: "createdAt", direction: "desc" },
      });

      return ctx.json(keys.map(({ key: _, ...k }) => k));
    }
  );
}
