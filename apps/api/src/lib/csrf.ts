import { Elysia } from "elysia";
import { getAllowedOriginSet } from "@/lib/origins";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const getRequestOrigin = (request: Request): string | null => {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      return null;
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  return null;
};

const hasBearerAuth = (request: Request): boolean =>
  request.headers.get("authorization")?.startsWith("Bearer ") ?? false;

const hasSessionCookie = (request: Request): boolean =>
  Boolean(request.headers.get("cookie")?.trim());

const allowedOrigins = getAllowedOriginSet();

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
