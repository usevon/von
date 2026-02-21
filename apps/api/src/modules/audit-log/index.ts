import { Elysia } from "elysia";
import { ErrorResponse } from "@/lib/models";
import { toCursorPageInput } from "@/lib/pagination";
import { AuditLogModel } from "@/modules/audit-log/model";
import { AuditLogService } from "@/modules/audit-log/service";
import { vonAuth } from "@/modules/auth";

export const auditLogRead = new Elysia({ prefix: "/audit-log" })
  .use(vonAuth("read:*"))
  .guard({ response: { 401: ErrorResponse, 403: ErrorResponse } })
  .get(
    "/",
    ({ organizationId, scopes, query, status }) => {
      if (!scopes.includes("*")) {
        return status(403, { error: "Forbidden", code: "SESSION_REQUIRED" });
      }
      return AuditLogService.list(organizationId, toCursorPageInput(query), {
        action: query.action,
        resourceType: query.resourceType,
        actorId: query.actorId,
      });
    },
    {
      query: AuditLogModel.query,
      response: {
        200: AuditLogModel.list,
        403: ErrorResponse,
      },
    }
  );
