import { Elysia, t } from "elysia";
import { ErrorResponse, PaginationQuery, SuccessResponse } from "@/lib/models";
import { vonAuth } from "@/modules/auth";
import { VersionModel } from "@/modules/versions/model";
import { VersionService } from "@/modules/versions/service";

const VersionParam = t.Object({
  version: t.String(),
});

export const versionsRead = new Elysia({ prefix: "/versions" })
  .use(vonAuth("read:versions"))
  .guard({ response: { 401: ErrorResponse, 403: ErrorResponse } })
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
    async ({ organizationId, params, status }) => {
      const version = await VersionService.getByVersion(
        organizationId,
        params.version
      );
      if (!version) {
        return status(404, { error: "Version not found" });
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
  );

export const versionsWrite = new Elysia({ prefix: "/versions" })
  .use(vonAuth("write:versions"))
  .guard({ response: { 401: ErrorResponse, 403: ErrorResponse } })
  .post(
    "/",
    async ({ organizationId, body, status }) =>
      status(
        201,
        await VersionService.create({
          organizationId,
          ...body,
        })
      ),
    {
      body: VersionModel.createBody,
      response: { 201: VersionModel.webhookVersion },
    }
  )
  .patch(
    "/:version",
    async ({ organizationId, params, body, status }) => {
      const version = await VersionService.update({
        organizationId,
        version: params.version,
        ...body,
      });
      if (!version) {
        return status(404, { error: "Version not found" });
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
