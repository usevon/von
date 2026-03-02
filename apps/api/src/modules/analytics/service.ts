import { db } from "@usevon/db";
import { delivery, event } from "@usevon/db/schema";
import { BadRequestError } from "@usevon/utils";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { AnalyticsModel } from "@/modules/analytics/model";

const parseDate = (value: string | undefined, fieldName: "from" | "to") => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError(`Invalid ${fieldName} date`);
  }
  return date;
};

const roundRate = (value: number) => Number((value * 100).toFixed(2));

export abstract class AnalyticsService {
  static async getOverview(
    organizationId: string,
    query: AnalyticsModel.query
  ): Promise<AnalyticsModel.overview> {
    const from = parseDate(query.from, "from");
    const to = parseDate(query.to, "to");

    if (from && to && from > to) {
      throw new BadRequestError("from must be before or equal to to");
    }

    const conditions = [eq(event.organizationId, organizationId)];
    if (from) {
      conditions.push(gte(delivery.createdAt, from));
    }
    if (to) {
      conditions.push(lte(delivery.createdAt, to));
    }

    const where = and(...conditions);
    const [deliveryTotals] = await db
      .select({
        deliveries: sql<number>`count(*)::int`,
        delivered: sql<number>`sum(case when ${delivery.status} = 'delivered' then 1 else 0 end)::int`,
        failed: sql<number>`sum(case when ${delivery.status} = 'failed' then 1 else 0 end)::int`,
        pending: sql<number>`sum(case when ${delivery.status} = 'pending' then 1 else 0 end)::int`,
        paused: sql<number>`sum(case when ${delivery.status} = 'paused' then 1 else 0 end)::int`,
        skipped: sql<number>`sum(case when ${delivery.status} = 'skipped' then 1 else 0 end)::int`,
        circuitOpen: sql<number>`sum(case when ${delivery.status} = 'circuit_open' then 1 else 0 end)::int`,
        retries: sql<number>`sum(case when ${delivery.attempts} > 1 then 1 else 0 end)::int`,
      })
      .from(delivery)
      .innerJoin(event, eq(delivery.eventId, event.id))
      .where(where);

    const eventConditions = [eq(event.organizationId, organizationId)];
    if (from) {
      eventConditions.push(gte(event.createdAt, from));
    }
    if (to) {
      eventConditions.push(lte(event.createdAt, to));
    }

    const [eventTotals] = await db
      .select({ events: sql<number>`count(*)::int` })
      .from(event)
      .where(and(...eventConditions));

    const deliveries = deliveryTotals?.deliveries ?? 0;
    const delivered = deliveryTotals?.delivered ?? 0;
    const failed = deliveryTotals?.failed ?? 0;
    const retries = deliveryTotals?.retries ?? 0;

    return {
      totals: {
        events: eventTotals?.events ?? 0,
        deliveries,
        delivered,
        failed,
        pending: deliveryTotals?.pending ?? 0,
        paused: deliveryTotals?.paused ?? 0,
        skipped: deliveryTotals?.skipped ?? 0,
        circuitOpen: deliveryTotals?.circuitOpen ?? 0,
      },
      rates: {
        successRate: deliveries > 0 ? roundRate(delivered / deliveries) : 0,
        failureRate: deliveries > 0 ? roundRate(failed / deliveries) : 0,
        retryRate: deliveries > 0 ? roundRate(retries / deliveries) : 0,
      },
    };
  }
}
