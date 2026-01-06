import { NotFoundError } from "@usevon/utils";
import { Elysia, t } from "elysia";
import { ErrorResponse, PaginationQuery, SuccessResponse } from "@/lib/models";
import { requireOrg } from "@/modules/auth";
import { VersionModel } from "@/modules/versions/model";
import { VersionService } from "@/modules/versions/service";

const VersionParam = t.Object({
  version: t.String(),
});

export const versions = new Elysia({ prefix: "/versions" })
  .use(requireOrg)
  .post(
    "/",
    ({ organizationId, body, set }) => {
      set.status = 201;
      return VersionService.create({
        organizationId,
        ...body,
      });
    },
    {
      body: VersionModel.createBody,
      response: { 201: VersionModel.webhookVersion },
    }
  )
  .get(
    "/",
    ({ organizationId, query }) =>
      VersionService.getAll(
        organizationId,
        query.limit ?? 20,
        query.offset ?? 0
      ),
    {
      query: PaginationQuery,
      response: VersionModel.versionList,
    }
  )
  .get(
    "/:version",
    async ({ organizationId, params }) => {
      const version = await VersionService.getByVersion(
        organizationId,
        params.version
      );
      if (!version) {
        throw new NotFoundError("Version not found");
      }
      return version;
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
    async ({ organizationId, params, body }) => {
      const version = await VersionService.update({
        organizationId,
        version: params.version,
        ...body,
      });
      if (!version) {
        throw new NotFoundError("Version not found");
      }
      return version;
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
    async ({ organizationId, params }) => {
      await VersionService.delete(organizationId, params.version);
      return { success: true };
    },
    {
      params: VersionParam,
      response: {
        200: SuccessResponse,
        404: ErrorResponse,
      },
    }
  );
