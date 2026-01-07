import type { BetterAuthPlugin } from "better-auth";
import { hmacSign } from "@/plugins/api-key/crypto";
import { createApiKeyRoutes } from "@/plugins/api-key/routes";
import { apiKeySchema } from "@/plugins/api-key/schema";
import type {
  ApiKeyOptions,
  ResolvedApiKeyOptions,
} from "@/plugins/api-key/types";

const KEY_LENGTH = 64;
const START_LENGTH = 12;
const MAX_NAME_LENGTH = 64;
const MAX_EXPIRES_DAYS = 365;
const MAX_KEYS_PER_USER = 20;

function generateRandomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

function getEnvironmentPrefix(environment: string): string {
  const prefixMap: Record<string, string> = {
    dev: "von_dev_",
    staging: "von_stg_",
    prod: "von_prod_",
  };
  return prefixMap[environment] || "von_dev_";
}

export const ERROR_CODES = {
  UNAUTHORIZED_SESSION: "Unauthorized or invalid session",
  KEY_NOT_FOUND: "API Key not found",
  KEY_DISABLED: "API Key is disabled",
  KEY_EXPIRED: "API Key has expired",
  INVALID_API_KEY: "Invalid API key.",
  MAX_KEYS_EXCEEDED: "Maximum API keys limit reached",
  NAME_TOO_SHORT: "API key name must be at least 1 character",
  NAME_TOO_LONG: "API key name exceeds maximum length",
  EXPIRATION_TOO_LONG: "Expiration exceeds maximum allowed days",
} as const;

export const API_KEY_TABLE_NAME = "apikey";

export const apiKey = (options?: ApiKeyOptions) => {
  if (!options?.signingSecret && process.env.NODE_ENV === "production") {
    throw new Error("API key signingSecret is required in production");
  }

  const opts: ResolvedApiKeyOptions = {
    storage: options?.storage ?? "database",
    fallbackToDatabase: options?.fallbackToDatabase ?? false,
    secondaryStorage: options?.secondaryStorage,
    signingSecret: options?.signingSecret,
  };

  const schema = apiKeySchema();

  const keyGenerator = async (environment: string) => {
    const random = generateRandomString(KEY_LENGTH);
    const envPrefix = getEnvironmentPrefix(environment);
    if (opts.signingSecret) {
      const signature = await hmacSign(random, opts.signingSecret);
      return `${envPrefix}${random}.${signature}`;
    }
    return `${envPrefix}${random}`;
  };

  const routes = createApiKeyRoutes({
    keyGenerator,
    opts,
    keyLength: KEY_LENGTH,
    startLength: START_LENGTH,
    maxNameLength: MAX_NAME_LENGTH,
    maxExpiresDays: MAX_EXPIRES_DAYS,
    maxKeysPerUser: MAX_KEYS_PER_USER,
  });

  return {
    id: "api-key",
    $ERROR_CODES: ERROR_CODES,
    endpoints: {
      createApiKey: routes.createApiKey,
      verifyApiKey: routes.verifyApiKey,
      getApiKey: routes.getApiKey,
      updateApiKey: routes.updateApiKey,
      deleteApiKey: routes.deleteApiKey,
      listApiKeys: routes.listApiKeys,
    },
    schema,
  } satisfies BetterAuthPlugin;
};

export type { ApiKey, ApiKeyOptions } from "@/plugins/api-key/types";
