import {
  apiKeyClient,
  createAuthClient,
  organizationClient,
} from "@usevon/auth/client";
import { db, eq } from "@usevon/db";
import { organization, user } from "@usevon/db/schema";
import { secrets } from "bun";
import { app, client, startEventBufferFlusher } from "../setup";

startEventBufferFlusher();

type AutoProvisionedResources = {
  key: string;
  userId: string;
  organizationId: string;
};

const forceAutoProvision = process.env.VON_INTEGRATION_FORCE_AUTOKEY === "1";
const useStoredApiKey = process.env.VON_INTEGRATION_USE_STORED_KEY === "1";

const parseTimeoutMs = (
  value: string | undefined,
  fallback: number
): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const AUTH_STEP_TIMEOUT_MS = parseTimeoutMs(
  process.env.VON_INTEGRATION_AUTH_STEP_TIMEOUT_MS,
  30_000
);
const API_KEY_VALIDATION_TIMEOUT_MS = parseTimeoutMs(
  process.env.VON_INTEGRATION_KEY_VALIDATION_TIMEOUT_MS,
  5000
);
const AUTO_PROVISION_TIMEOUT_MS = parseTimeoutMs(
  process.env.VON_INTEGRATION_AUTOPROVISION_TIMEOUT_MS,
  120_000
);

const withTimeout = async <T>(
  label: string,
  timeoutMs: number,
  operation: () => Promise<T>
): Promise<T> =>
  await new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    operation()
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });

const isSecretsUnavailableError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "ERR_SECRETS_PLATFORM_ERROR";

const getStoredApiKey = async (): Promise<string | null> => {
  try {
    return await secrets.get({ service: "von", name: "VON_API_KEY" });
  } catch (error) {
    if (isSecretsUnavailableError(error)) {
      return null;
    }
    throw error;
  }
};

const deleteStoredApiKey = async (): Promise<void> => {
  try {
    await secrets.delete({ service: "von", name: "VON_API_KEY" });
  } catch (error) {
    if (isSecretsUnavailableError(error)) {
      return;
    }
    throw error;
  }
};

const isValidApiKey = async (key: string): Promise<boolean> => {
  const { error } = await withTimeout(
    "API key validation",
    API_KEY_VALIDATION_TIMEOUT_MS,
    () =>
      client.endpoints.get({
        headers: { authorization: `Bearer ${key}` },
      })
  );
  return error?.status !== 401;
};

const extractSessionCookie = (
  setCookieHeader: string | null
): string | null => {
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

const createTemporaryResources =
  async (): Promise<AutoProvisionedResources | null> => {
    const runAuthStep = <T>(label: string, operation: () => Promise<T>) =>
      withTimeout(label, AUTH_STEP_TIMEOUT_MS, operation);

    return await withTimeout(
      "Temporary integration resource provisioning",
      AUTO_PROVISION_TIMEOUT_MS,
      async () => {
        const cookieJar = new Headers();
        const authBaseUrl =
          process.env.BETTER_AUTH_URL ?? "http://localhost:8080";
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

              const response = await app.handle(
                new Request(url, { ...init, headers })
              );
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

        const signUpResult = await runAuthStep("Temporary user sign up", () =>
          authClient.signUp.email({
            name: "Integration User",
            email,
            password,
          })
        );
        if (signUpResult.error || !signUpResult.data?.user?.id) {
          console.error("[integration] sign-up failed:", signUpResult.error);
          return null;
        }

        await db
          .update(user)
          .set({ emailVerified: true })
          .where(eq(user.id, signUpResult.data.user.id));

        const signInResult = await runAuthStep("Temporary user sign in", () =>
          authClient.signIn.email({ email, password })
        );
        if (signInResult.error) {
          console.error("[integration] sign-in failed:", signInResult.error);
          return null;
        }

        const organizationResult = await runAuthStep(
          "Temporary organization create",
          () =>
            authClient.organization.create({
              name: `Integration ${suffix.slice(-6)}`,
              slug,
            })
        );
        if (organizationResult.error || !organizationResult.data?.id) {
          console.error(
            "[integration] org create failed:",
            organizationResult.error
          );
          return null;
        }

        const apiKeyResult = await runAuthStep("Temporary API key create", () =>
          authClient.apiKey.create({
            name: "Integration Test Key",
            environment: "dev",
            organizationId: organizationResult.data.id,
            scopes: ["*"],
          })
        );
        if (apiKeyResult.error || !apiKeyResult.data?.key) {
          console.error(
            "[integration] api key create failed:",
            apiKeyResult.error
          );
          return null;
        }

        return {
          key: apiKeyResult.data.key,
          userId: signUpResult.data.user.id,
          organizationId: organizationResult.data.id,
        };
      }
    );
  };

const cleanupTemporaryResources = async (
  resources: AutoProvisionedResources
): Promise<void> => {
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
};

const resolveApiKey = async (): Promise<{
  key: string;
  tempResources: AutoProvisionedResources | null;
}> => {
  if (!forceAutoProvision && useStoredApiKey && process.env.VON_API_KEY) {
    const ok = await isValidApiKey(process.env.VON_API_KEY);
    if (!ok) {
      throw new Error("VON_API_KEY is set but invalid");
    }

    return { key: process.env.VON_API_KEY, tempResources: null };
  }

  const saved =
    forceAutoProvision || !useStoredApiKey ? null : await getStoredApiKey();
  if (saved) {
    if (await isValidApiKey(saved)) {
      return { key: saved, tempResources: null };
    }
    await deleteStoredApiKey();
  }

  const tempResources = await createTemporaryResources();
  if (!tempResources) {
    throw new Error("Failed to create temporary integration API key");
  }

  if (!(await isValidApiKey(tempResources.key))) {
    await cleanupTemporaryResources(tempResources);
    throw new Error("Temporary integration API key validation failed");
  }

  return { key: tempResources.key, tempResources };
};

const run = async () => {
  const targets = process.argv.slice(2);
  const testTargets = targets.length > 0 ? targets : ["tests/integration/"];

  const { key, tempResources } = await resolveApiKey();
  if (tempResources) {
    console.log("Created temporary integration API key");
  } else {
    console.log("Using existing API key for integration tests");
  }

  const child = Bun.spawn(["bun", "test", ...testTargets], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      VON_API_KEY: key,
      VON_INTEGRATION_FORCE_AUTOKEY: "0",
    },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await child.exited;

  if (tempResources) {
    await cleanupTemporaryResources(tempResources);
    console.log("Cleaned up temporary integration resources");
  }

  process.exit(exitCode);
};

await run();
