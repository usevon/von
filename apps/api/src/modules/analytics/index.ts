import { Elysia } from "elysia";
import { ErrorResponse } from "@/lib/models";
import { AnalyticsModel } from "@/modules/analytics/model";
import { AnalyticsService } from "@/modules/analytics/service";
import { vonAuth } from "@/modules/auth";

export const analyticsRead = new Elysia({ prefix: "/analytics" })
  .use(vonAuth("read:*"))
  .guard({ response: { 401: ErrorResponse, 403: ErrorResponse } })
  .get(
    "/overview",
    ({ organizationId, scopes, query, status }) => {
      if (!scopes.includes("*")) {
        return status(403, { error: "Forbidden", code: "SESSION_REQUIRED" });
      }
      return AnalyticsService.getOverview(organizationId, query);
    },
    {
      query: AnalyticsModel.query,
      response: {
        200: AnalyticsModel.overview,
        403: ErrorResponse,
      },
    }
  );
