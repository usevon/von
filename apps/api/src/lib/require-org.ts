import { BadRequestError } from "@usevon/utils";
import { Elysia } from "elysia";
import { userRateLimit } from "@/lib/rate-limit";

export const requireOrg = new Elysia({ name: "require-org" })
  .use(userRateLimit({ windowMs: 60_000, max: 200, keyPrefix: "rl:auth" }))
  .resolve(({ organizationId }) => {
    if (!organizationId) {
      throw new BadRequestError("No active organization");
    }
    return { organizationId: organizationId as string };
  });
