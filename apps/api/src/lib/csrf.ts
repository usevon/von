import { Elysia } from "elysia";
import { env } from "@/env";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const normalizeOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const getAllowedOrigins = (): Set<string> => {
  const origins = new Set<string>();

  if (env.CORS_ORIGINS) {
    for (const origin of env.CORS_ORIGINS.split(",")) {
      const normalized = normalizeOrigin(origin.trim());
      if (normalized) {
        origins.add(normalized);
      }
    }
  }

  const dashboardOrigin = normalizeOrigin(
    env.DASHBOARD_URL ?? "http://localhost:3001"
  );
  if (dashboardOrigin) {
    origins.add(dashboardOrigin);
  }

  return origins;
};

const getRequestOrigin = (request: Request): string | null => {
  const origin = request.headers.get("origin");
  if (origin) {
    return normalizeOrigin(origin);
  }

  const referer = request.headers.get("referer");
  if (referer) {
    return normalizeOrigin(referer);
  }

  return null;
};

const hasBearerAuth = (request: Request): boolean =>
  request.headers.get("authorization")?.startsWith("Bearer ") ?? false;

const hasSessionCookie = (request: Request): boolean =>
  Boolean(request.headers.get("cookie")?.trim());

const allowedOrigins = getAllowedOrigins();

export const csrfProtection = () =>
  new Elysia({ name: "csrf-protection" }).onBeforeHandle(
    { as: "global" },
    ({ request, status }) => {
      if (!MUTATING_METHODS.has(request.method)) {
        return;
      }

      if (hasBearerAuth(request) || !hasSessionCookie(request)) {
        return;
      }

      const origin = getRequestOrigin(request);
      if (!origin) {
        return status(403, { error: "Missing Origin/Referer header" });
      }

      if (!allowedOrigins.has(origin)) {
        return status(403, { error: "Origin not allowed" });
      }
    }
  );
