import { Elysia } from "elysia";
import { ErrorResponse, ReadGuard } from "@/lib/models";
import { AnalyticsModel } from "@/modules/analytics/model";
import { AnalyticsService } from "@/modules/analytics/service";
import { vonAuth } from "@/modules/auth";

export const analyticsRead = new Elysia({ prefix: "/analytics" })
  .use(vonAuth("read:analytics"))
  .guard({ response: ReadGuard })
  .get(
    "/overview",
    ({ organizationId, query }) =>
      AnalyticsService.getOverview(organizationId, query),
    {
      query: AnalyticsModel.query,
      response: {
        200: AnalyticsModel.overview,
        403: ErrorResponse,
      },
    }
  )
  .get(
    "/timeseries",
    ({ organizationId, query }) =>
      AnalyticsService.getTimeseries(organizationId, query),
    {
      query: AnalyticsModel.timeseriesQuery,
      response: {
        200: AnalyticsModel.timeseries,
        403: ErrorResponse,
      },
    }
  )
  .get(
    "/retries",
    ({ organizationId, query }) =>
      AnalyticsService.getRetries(organizationId, query),
    {
      query: AnalyticsModel.query,
      response: {
        200: AnalyticsModel.retries,
        403: ErrorResponse,
      },
    }
  );
