/**
 * Von Auth
 *
 * Re-exports better-auth/minimal and custom plugins.
 * Use @usevon/auth/client for React client exports.
 */

// Adapters
export { drizzleAdapter } from "better-auth/adapters/drizzle";
// Utilities
export { getSessionCookie } from "better-auth/cookies";
export { betterAuth } from "better-auth/minimal";
export { toNextJsHandler } from "better-auth/next-js";
// Plugins
export {
  bearer,
  deviceAuthorization,
  organization,
} from "better-auth/plugins";
export { emailHarmony } from "better-auth-harmony";

// Custom API key plugin
export type { ApiKey, ApiKeyOptions } from "@/plugins/api-key";
export { apiKey } from "@/plugins/api-key";
export {
  hasScope,
  parseScopes,
  type Scope,
  VALID_SCOPES,
} from "@/plugins/api-key/scopes";
