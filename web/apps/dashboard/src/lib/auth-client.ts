import { createAuthClient } from 'better-auth/react';
import { organizationClient, apiKeyClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL || 'http://localhost:5174',
  plugins: [organizationClient(), apiKeyClient()],
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  organization,
  apiKey,
} = authClient;
