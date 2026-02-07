/**
 * Von Auth
 *
 * Re-exports better-auth/minimal and custom plugins.
 * Use @usevon/auth/client for React client exports.
 */

export { betterAuth } from "better-auth/minimal";

// Adapters
export { drizzleAdapter } from "better-auth/adapters/drizzle";

// Plugins
export {
  bearer,
  organization,
  deviceAuthorization,
} from "better-auth/plugins";
export { emailHarmony } from "better-auth-harmony";

// Utilities
export { getSessionCookie } from "better-auth/cookies";
export { toNextJsHandler } from "better-auth/next-js";

// Custom API key plugin
export type { ApiKey, ApiKeyOptions } from "@/plugins/api-key";
export { apiKey } from "@/plugins/api-key";
