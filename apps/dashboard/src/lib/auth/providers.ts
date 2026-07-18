import { env } from "@/env";
import { log } from "@/lib/logger";

type SocialProvider = {
  clientId: string;
  clientSecret: string;
};

export const buildSocialProviders = ():
  | Record<string, SocialProvider>
  | undefined => {
  const providers: Record<string, SocialProvider> = {};

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    };
  }

  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    };
  }

  if (Object.keys(providers).length === 0) {
    if (env.NODE_ENV === "development") {
      log.debug(
        "No OAuth providers configured, social login disabled in development"
      );
    }
    return;
  }

  return providers;
};
