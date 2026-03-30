import { env } from "@/env";

const normalizeOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const getAllowedOrigins = (): string[] => {
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

  if (origins.size === 0 && env.NODE_ENV !== "production") {
    origins.add("http://localhost:3001");
  }

  return [...origins];
};

let cached: string[] | null = null;

export const getCorsOrigins = (): string[] => {
  if (!cached) {
    cached = getAllowedOrigins();
    if (cached.length === 0 && env.NODE_ENV === "production") {
      throw new Error("CORS_ORIGINS required in production");
    }
  }
  return cached;
};

export const getAllowedOriginSet = (): Set<string> => new Set(getCorsOrigins());
