import { APIError, createAuthEndpoint } from "better-auth/api";
import { z } from "zod";
import { ERROR_CODES } from "@/plugins/api-key";
import {
  deleteApiKey as deleteApiKeyFromStorage,
  getApiKey,
} from "@/plugins/api-key/adapter";
import {
  hashKey,
  hasValidPrefix,
  verifySignature,
} from "@/plugins/api-key/crypto";
import type { ApiKey, ResolvedApiKeyOptions } from "@/plugins/api-key/types";

const API_KEY_TABLE_NAME = "apikey";

type EndpointContext = {
  context: {
    adapter: {
      findOne: <T>(opts: {
        model: string;
        where: { field: string; value: unknown }[];
      }) => Promise<T | null>;
      delete: (opts: {
        model: string;
        where: { field: string; value: unknown }[];
      }) => Promise<void>;
    };
    logger: { error: (msg: string, ...args: unknown[]) => void };
    secondaryStorage?: {
      get: (key: string) => Promise<unknown> | unknown;
      set: (
        key: string,
        value: string,
        ttl?: number
      ) => Promise<undefined | null | unknown> | undefined;
      delete: (key: string) => Promise<undefined | null | string> | undefined;
    } | null;
  };
};

export async function validateApiKey({
  hashedKey,
  ctx,
  opts,
}: {
  hashedKey: string;
  opts: ResolvedApiKeyOptions;
  ctx: EndpointContext;
}): Promise<ApiKey> {
  const apiKey = await getApiKey(ctx as never, hashedKey, opts);

  if (!apiKey) {
    throw new APIError("UNAUTHORIZED", {
      message: ERROR_CODES.INVALID_API_KEY,
    });
  }

  if (apiKey.enabled === false) {
    throw new APIError("UNAUTHORIZED", {
      message: ERROR_CODES.KEY_DISABLED,
    });
  }

  if (apiKey.expiresAt) {
    const now = Date.now();
    const expiresAt = new Date(apiKey.expiresAt).getTime();
    if (now > expiresAt) {
      try {
        await ctx.context.adapter.delete({
          model: API_KEY_TABLE_NAME,
          where: [{ field: "id", value: apiKey.id }],
        });
        await deleteApiKeyFromStorage(ctx, apiKey, opts);
      } catch (error) {
        ctx.context.logger.error("Failed to delete expired API key:", error);
      }

      throw new APIError("UNAUTHORIZED", {
        message: ERROR_CODES.KEY_EXPIRED,
      });
    }
  }

  return apiKey;
}

export function verifyApiKey({
  opts,
  keyLength,
}: {
  opts: ResolvedApiKeyOptions;
  keyLength: number;
}) {
  return createAuthEndpoint(
    "/api-key/verify",
    {
      method: "POST",
      body: z.object({
        key: z.string(),
      }),
      metadata: {
        SERVER_ONLY: true,
      },
    },
    async (ctx) => {
      const { key } = ctx.body;

      const lengthValid = key.length >= keyLength;
      const prefixValid = hasValidPrefix(key);

      const signatureValid = opts.signingSecret
        ? verifySignature(key, opts.signingSecret)
        : true;

      if (!(lengthValid && prefixValid && signatureValid)) {
        return ctx.json({
          valid: false,
          error: { message: ERROR_CODES.INVALID_API_KEY, code: "INVALID_KEY" },
          key: null,
        });
      }

      const hashed = hashKey(key);

      try {
        const { key: _hash, ...apiKeyData } = await validateApiKey({
          hashedKey: hashed,
          ctx: ctx as never,
          opts,
        });

        return ctx.json({
          valid: true,
          error: null,
          key: apiKeyData,
        });
      } catch (error) {
        if (error instanceof APIError) {
          return ctx.json({
            valid: false,
            error: {
              message:
                (error.body as { message?: string })?.message ??
                ERROR_CODES.INVALID_API_KEY,
              code: "INVALID_KEY",
            },
            key: null,
          });
        }

        return ctx.json({
          valid: false,
          error: { message: ERROR_CODES.INVALID_API_KEY, code: "INVALID_KEY" },
          key: null,
        });
      }
    }
  );
}
