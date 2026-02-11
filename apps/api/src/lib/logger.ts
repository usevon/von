import { createLogger } from "@usevon/utils/logger";
import { env } from "@/env";

export const log = createLogger({
  name: "api",
  level: env.NODE_ENV === "development" ? "debug" : "info",
  pretty: env.NODE_ENV === "development",
});
