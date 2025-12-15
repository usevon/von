import { Elysia } from "elysia"
import { BadRequestError } from "@usevon/utils"

export const requireOrg = new Elysia({ name: "require-org" })
  .derive(({ organizationId }) => {
    if (!organizationId) {
      throw new BadRequestError("No active organization")
    }
    return { organizationId: organizationId as string }
  })
