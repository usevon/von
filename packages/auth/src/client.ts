/**
 * Von Auth Client
 *
 * Client-side authentication for React applications.
 * Uses cookies for browser auth, organization and API key plugins.
 */

import {
  deviceAuthorizationClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient as createBetterAuthClient } from "better-auth/react";
import { apiKeyClient } from "@/plugins/api-key/client";

export type CreateAuthClientOptions = {
  baseURL?: string;
};

export const createAuthClient = (options: CreateAuthClientOptions = {}) =>
  createBetterAuthClient({
    baseURL: options.baseURL,
    plugins: [
      organizationClient(),
      apiKeyClient(),
      deviceAuthorizationClient(),
    ],
  });
