import { Elysia } from "elysia"
import { BadRequestError } from "@usevon/utils"
import { userRateLimit } from "@/lib/rate-limit"

export const requireOrg = new Elysia({ name: "require-org" })
  .use(userRateLimit({ windowMs: 60000, max: 200, keyPrefix: "rl:auth" }))
  .derive(({ organizationId }) => {
    if (!organizationId) {
      throw new BadRequestError("No active organization")
    }
    return { organizationId: organizationId as string }
  })
