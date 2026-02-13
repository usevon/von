import { apiKeyClient, createAuthClient, organizationClient } from "@usevon/auth/client";
import { db, eq } from "@usevon/db";
import { organization, user } from "@usevon/db/schema";
import { secrets } from "bun";
import { app, client } from "../setup";

const isIntegrationTest = process.argv.some((arg) =>
  arg.includes("integration")
);
const isInteractive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
const forceAutoProvision = process.env.VON_INTEGRATION_FORCE_AUTOKEY === "1";

type AutoProvisionedResources = {
  key: string;
  userId: string;
  organizationId: string;
};

let autoProvisionedResources: AutoProvisionedResources | null = null;
let cleanupHookRegistered = false;
let cleanupInFlight: Promise<void> | null = null;

const validateKey = async (key: string): Promise<boolean> => {
  const { error } = await client.endpoints.get({
    headers: { authorization: `Bearer ${key}` },
  });
  return error?.status !== 401;
};

const extractSessionCookie = (setCookieHeader: string | null): string | null => {
  if (!setCookieHeader) {
    return null;
  }

  for (const name of ["von.session_token", "better-auth.session_token"]) {
    const match = setCookieHeader.match(new RegExp(`${name}=([^;]+)`));
    if (match?.[1]) {
      return `${name}=${match[1]}`;
    }
  }

  return null;
};

const cleanupProvisionedResources = async (
  resources: AutoProvisionedResources,
  options?: { log?: boolean }
) => {
  try {
    await db
      .delete(organization)
      .where(eq(organization.id, resources.organizationId));
  } catch {
    // Best effort cleanup.
  }

  try {
    await db.delete(user).where(eq(user.id, resources.userId));
  } catch {
    // Best effort cleanup.
  }

  if (process.env.VON_API_KEY === resources.key) {
    delete process.env.VON_API_KEY;
  }

  if (options?.log !== false) {
    console.log("\nCleaned up auto-created integration resources");
  }
};

const runAutoCleanup = async () => {
  if (!autoProvisionedResources) {
    return;
  }

  const resources = autoProvisionedResources;
  autoProvisionedResources = null;
  await cleanupProvisionedResources(resources);
};

const registerCleanupHook = () => {
  if (cleanupHookRegistered) {
    return;
  }

  cleanupHookRegistered = true;

  const triggerCleanup = () => {
    if (!cleanupInFlight) {
      cleanupInFlight = runAutoCleanup();
    }
    return cleanupInFlight;
  };

  process.once("beforeExit", () => {
    void triggerCleanup();
  });

  process.once("SIGINT", () => {
    void triggerCleanup().finally(() => process.exit(130));
  });

  process.once("SIGTERM", () => {
    void triggerCleanup().finally(() => process.exit(143));
  });
};

const createIntegrationApiKey = async (): Promise<AutoProvisionedResources | null> => {
  const cookieJar = new Headers();
  const authBaseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:8080";
  const origin = process.env.DASHBOARD_URL ?? "http://localhost:3001";

  const authClient = createAuthClient({
    baseURL: authBaseUrl,
    plugins: [organizationClient(), apiKeyClient()],
    fetchOptions: {
      customFetchImpl: async (url, init) => {
        const headers = new Headers(init?.headers);
        const sessionCookie = cookieJar.get("cookie");

        if (sessionCookie && !headers.has("cookie")) {
          headers.set("cookie", sessionCookie);
        }
        if (!headers.has("origin")) {
          headers.set("origin", origin);
        }

        const response = await app.handle(new Request(url, { ...init, headers }));
        const nextSessionCookie = extractSessionCookie(
          response.headers.get("set-cookie")
        );
        if (nextSessionCookie) {
          cookieJar.set("cookie", nextSessionCookie);
        }

        return response;
      },
    },
  });

  const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const email = `integration-${suffix}@example.com`;
  const password = `IntTest!${Math.random().toString(36).slice(2, 10)}Aa1`;
  const slug = `integration-${suffix}`.slice(0, 48);

  const signUpResult = await authClient.signUp.email({
    name: "Integration User",
    email,
    password,
  });

  if (signUpResult.error) {
    console.log(`\nAutomatic sign up failed: ${signUpResult.error.message}`);
    return null;
  }

  const userId = signUpResult.data?.user?.id;
  if (!userId) {
    console.log("\nAutomatic sign up returned no user id");
    return null;
  }

  const signInResult = await authClient.signIn.email({
    email,
    password,
  });
  if (signInResult.error) {
    console.log(`\nAutomatic sign in failed: ${signInResult.error.message}`);
    return null;
  }

  const organizationResult = await authClient.organization.create({
    name: `Integration ${suffix.slice(-6)}`,
    slug,
  });

  if (organizationResult.error || !organizationResult.data?.id) {
    console.log(
      `\nAutomatic organization create failed: ${organizationResult.error?.message ?? "Unknown error"}`
    );
    return null;
  }

  const apiKeyResult = await authClient.apiKey.create({
    name: "Integration Test Key",
    environment: "dev",
    organizationId: organizationResult.data.id,
    scopes: ["*"],
  });

  if (apiKeyResult.error || !apiKeyResult.data?.key) {
    console.log(
      `\nAutomatic API key create failed: ${apiKeyResult.error?.message ?? "Unknown error"}`
    );
    return null;
  }

  return {
    key: apiKeyResult.data.key,
    userId,
    organizationId: organizationResult.data.id,
  };
};

const useApiKey = async (
  key: string,
  options?: { persistToKeychain?: boolean }
): Promise<boolean> => {
  const valid = await validateKey(key);
  if (!valid) {
    return false;
  }

  process.env.VON_API_KEY = key;
  if (options?.persistToKeychain) {
    try {
      await secrets.set({ service: "von", name: "VON_API_KEY", value: key });
    } catch {
      // Ignore keychain failures in CI/non-interactive envs.
    }
  }

  return true;
};

const promptUntilValid = async () => {
  while (true) {
    const key = prompt(
      "Enter your VON_API_KEY (or press Enter to skip):"
    )?.trim();
    if (!key) {
      return;
    }

    const valid = await useApiKey(key, { persistToKeychain: true });
    if (valid) {
      console.log("Saved to OS keychain\n");
      return;
    }
    console.log("Invalid API key, try again");
  }
};

if (isIntegrationTest && !process.env.VON_API_KEY) {
  if (forceAutoProvision) {
    console.log("\nForcing auto-provisioned integration API key");
  }

  const saved = await secrets.get({ service: "von", name: "VON_API_KEY" });

  if (saved && !forceAutoProvision) {
    const valid = await useApiKey(saved);
    if (valid) {
      console.log("\nUsing saved API key for integration tests");
    } else {
      console.log("\nSaved API key is invalid");
      await secrets.delete({ service: "von", name: "VON_API_KEY" });
    }
  }

  if (!process.env.VON_API_KEY) {
    console.log("\nNo API key found for integration tests");
    const created = await createIntegrationApiKey();
    if (created && (await useApiKey(created.key))) {
      autoProvisionedResources = created;
      registerCleanupHook();
      console.log("Created API key for integration tests\n");
    } else if (created) {
      await cleanupProvisionedResources(created, { log: false });
    }
  }

  if (!process.env.VON_API_KEY && isInteractive) {
    await promptUntilValid();
  }

  if (!process.env.VON_API_KEY && !isInteractive) {
    console.log("\nSkipping integration tests that require VON_API_KEY");
  }
}

export const getApiKey = () => process.env.VON_API_KEY;
