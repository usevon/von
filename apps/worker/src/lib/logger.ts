import { createLogger } from "@usevon/utils/logger";
import { env } from "@/env";

export const log = createLogger({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  pretty: env.NODE_ENV === "development",
});
