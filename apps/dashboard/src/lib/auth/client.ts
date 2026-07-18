import {
  createAuthClient,
  deviceAuthorizationClient,
  organizationClient,
} from "@usevon/auth/client";

export const authClient = createAuthClient({
  baseURL:
    typeof window === "undefined"
      ? (process.env.BETTER_AUTH_URL ?? "http://localhost:3001")
      : window.location.origin,
  plugins: [organizationClient(), deviceAuthorizationClient()],
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  deleteUser,
  organization,
  device,
} = authClient;
