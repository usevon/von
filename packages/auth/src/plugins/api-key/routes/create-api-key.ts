import {
  APIError,
  createAuthEndpoint,
  getSessionFromCtx,
} from "better-auth/api";
import { z } from "zod";
import { ERROR_CODES } from "@/plugins/api-key";
import { setApiKey } from "@/plugins/api-key/adapter";
import { hashKey } from "@/plugins/api-key/crypto";
import type { ApiKey, ResolvedApiKeyOptions } from "@/plugins/api-key/types";

const API_KEY_TABLE_NAME = "apikey";

export function createApiKey({
  keyGenerator,
  opts,
  startLength,
  maxNameLength,
  maxExpiresDays,
  maxKeysPerUser,
}: {
  keyGenerator: (environment: string) => Promise<string>;
  opts: ResolvedApiKeyOptions;
  startLength: number;
  maxNameLength: number;
  maxExpiresDays: number;
  maxKeysPerUser: number;
}) {
  return createAuthEndpoint(
    "/api-key/create",
    {
      method: "POST",
      body: z.object({
        name: z.string().min(1).max(maxNameLength),
        expiresIn: z.number().min(1).optional(),
        environment: z.enum(["dev", "staging", "prod"]),
        organizationId: z.string().optional(),
      }),
    },
    async (ctx) => {
      const { name, expiresIn, environment, organizationId } = ctx.body;

      const session = await getSessionFromCtx(ctx);
      if (!session) {
        throw new APIError("UNAUTHORIZED", {
          message: ERROR_CODES.UNAUTHORIZED_SESSION,
        });
      }

      const existingKeys = await ctx.context.adapter.findMany<{ id: string }>({
        model: API_KEY_TABLE_NAME,
        where: [{ field: "userId", value: session.user.id }],
      });
      if (existingKeys.length >= maxKeysPerUser) {
        throw new APIError("TOO_MANY_REQUESTS", {
          message: ERROR_CODES.MAX_KEYS_EXCEEDED,
        });
      }

      if (expiresIn) {
        const expiresInDays = expiresIn / (60 * 60 * 24);
        if (expiresInDays > maxExpiresDays) {
          throw new APIError("BAD_REQUEST", {
            message: ERROR_CODES.EXPIRATION_TOO_LONG,
          });
        }
      }

      if (organizationId) {
        const membership = await ctx.context.adapter.findOne<{ id: string }>({
          model: "member",
          where: [
            { field: "userId", value: session.user.id },
            { field: "organizationId", value: organizationId },
          ],
        });
        if (!membership) {
          throw new APIError("FORBIDDEN", {
            message: "Not a member of this organization",
          });
        }
      }

      const key = await keyGenerator(environment);
      const hashed = hashKey(key);
      const start = key.substring(0, startLength);

      const data: Omit<ApiKey, "id"> = {
        name,
        start,
        key: hashed,
        userId: session.user.id,
        organizationId: organizationId ?? null,
        environment,
        enabled: true,
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const apiKey = await ctx.context.adapter.create<
        Omit<ApiKey, "id">,
        ApiKey
      >({
        model: API_KEY_TABLE_NAME,
        data,
      });

      await setApiKey(ctx as never, apiKey, opts);

      // Audit log
      ctx.context.logger.info("API key created", {
        userId: session.user.id,
        keyId: apiKey.id,
        environment,
        organizationId: organizationId ?? null,
      });

      return ctx.json({
        ...apiKey,
        key,
      });
    }
  );
}
