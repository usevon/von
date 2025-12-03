import { Elysia, t } from "elysia"
import { PaginationQuery, ErrorResponse, SuccessResponse } from "@/lib/models"
import { withAuth } from "@/modules/auth"
import { BadRequestError } from "@/lib/errors"
import { VersionModel } from "./model"
import { VersionService } from "./service"

const VersionParam = t.Object({
  version: t.String(),
})

export const versions = new Elysia({ prefix: "/versions" })
  .use(withAuth)
  .post(
    "/",
    async ({ organizationId, body, set }) => {
      if (!organizationId) throw new BadRequestError("No active organization")
      set.status = 201
      return VersionService.create({
        organizationId,
        ...body,
      })
    },
    {
      body: VersionModel.createBody,
      response: { 201: VersionModel.webhookVersion },
    }
  )
  .get(
    "/",
    async ({ organizationId, query }) => {
      if (!organizationId) return { versions: [], total: 0 }
      return VersionService.getAll(organizationId, query.limit ?? 20, query.offset ?? 0)
    },
    {
      query: PaginationQuery,
      response: VersionModel.versionList,
    }
  )
  .get(
    "/:version",
    async ({ organizationId, params, status }) => {
      if (!organizationId) return status(404, { error: "Version not found" })
      const version = await VersionService.getByVersion(organizationId, params.version)

      if (!version) {
        return status(404, { error: "Version not found" })
      }

      return version
    },
    {
      params: VersionParam,
      response: {
        200: VersionModel.webhookVersion,
        404: ErrorResponse,
      },
    }
  )
  .patch(
    "/:version",
    async ({ organizationId, params, body, status }) => {
      if (!organizationId) return status(404, { error: "Version not found" })
      const version = await VersionService.update({
        organizationId,
        version: params.version,
        ...body,
      })

      if (!version) {
        return status(404, { error: "Version not found" })
      }

      return version
    },
    {
      params: VersionParam,
      body: VersionModel.updateBody,
      response: {
        200: VersionModel.webhookVersion,
        404: ErrorResponse,
      },
    }
  )
  .delete(
    "/:version",
    async ({ organizationId, params, status }) => {
      if (!organizationId) return status(404, { error: "Version not found" })
      await VersionService.delete(organizationId, params.version)

      return { success: true }
    },
    {
      params: VersionParam,
      response: {
        200: SuccessResponse,
        404: ErrorResponse,
      },
    }
  )

export { VersionModel, VersionService }
