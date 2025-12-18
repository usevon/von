import { clearBearerToken, createAuthClient } from "@usevon/auth/client";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
});

const originalSignOut = authClient.signOut;
const originalDeleteUser = authClient.deleteUser;

export const signOut = () => {
  clearBearerToken();
  return originalSignOut();
};

export const deleteUser = () => {
  clearBearerToken();
  return originalDeleteUser();
};

export const { useSession, signIn, signUp, organization, apiKey, device } =
  authClient;
