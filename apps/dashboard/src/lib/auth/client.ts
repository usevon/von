import { createAuthClient } from "@von/auth/client"

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
})

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  organization,
  apiKey,
} = authClient
