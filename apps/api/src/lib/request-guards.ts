import { Elysia } from "elysia";
import { env } from "@/env";

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const parseContentLength = (request: Request): number | null => {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) {
    return null;
  }

  const parsed = Number.parseInt(contentLength, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

const getUrlLength = (requestUrl: string): number => {
  const url = new URL(requestUrl);
  return url.pathname.length + url.search.length;
};

export const requestGuards = () =>
  new Elysia({ name: "request-guards" }).onBeforeHandle(
    { as: "global" },
    async ({ request, status }) => {
      const urlLength = getUrlLength(request.url);
      if (urlLength > env.API_MAX_URL_LENGTH) {
        return status(414, {
          error: `Request URL exceeds ${env.API_MAX_URL_LENGTH} characters`,
        });
      }

      if (!METHODS_WITH_BODY.has(request.method)) {
        return;
      }

      const contentLength = parseContentLength(request);
      if (contentLength !== null) {
        if (contentLength > env.API_MAX_BODY_BYTES) {
          return status(413, {
            error: `Payload exceeds ${env.API_MAX_BODY_BYTES} byte limit`,
          });
        }
        return;
      }

      const bodySize = (await request.clone().arrayBuffer()).byteLength;
      if (bodySize > env.API_MAX_BODY_BYTES) {
        return status(413, {
          error: `Payload exceeds ${env.API_MAX_BODY_BYTES} byte limit`,
        });
      }
    }
  );
