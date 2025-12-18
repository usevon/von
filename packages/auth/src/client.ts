/**
 * Von Auth Client
 *
 * Client-side authentication for React applications.
 * Includes organization and API key client plugins.
 * Uses Bearer tokens for cross-origin authentication.
 */

import {
  deviceAuthorizationClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient as createBetterAuthClient } from "better-auth/react";
import { apiKeyClient } from "@/plugins/api-key/client";

export const BEARER_TOKEN_KEY = "von_bearer_token";

export type CreateAuthClientOptions = {
  baseURL: string;
};

export const createAuthClient = (options: CreateAuthClientOptions) =>
  createBetterAuthClient({
    baseURL: options.baseURL,
    plugins: [
      organizationClient(),
      apiKeyClient(),
      deviceAuthorizationClient(),
    ],
    fetchOptions: {
      auth: {
        type: "Bearer",
        token: () => {
          if (typeof window === "undefined") {
            return "";
          }
          return localStorage.getItem(BEARER_TOKEN_KEY) || "";
        },
      },
      onSuccess: (ctx) => {
        const token = ctx.response.headers.get("set-auth-token");
        if (token && typeof window !== "undefined") {
          localStorage.setItem(BEARER_TOKEN_KEY, token);
        }
      },
    },
  });

export const getBearerToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(BEARER_TOKEN_KEY);
};

export const clearBearerToken = (): void => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(BEARER_TOKEN_KEY);
};
