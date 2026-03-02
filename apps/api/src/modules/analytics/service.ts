import { db } from "@usevon/db";
import { delivery, deliveryAttempt, event } from "@usevon/db/schema";
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
const roundValue = (value: number, precision = 2) =>
  Number(value.toFixed(precision));

type TimeseriesInterval = "5m" | "15m" | "1h" | "1d";

const INTERVAL_SECONDS: Record<TimeseriesInterval, number> = {
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "1d": 86_400,
};

const validateRange = (from: Date | null, to: Date | null) => {
  if (from && to && from > to) {
    throw new BadRequestError("from must be before or equal to to");
  }
};

export abstract class AnalyticsService {
  static async getOverview(
    organizationId: string,
    query: AnalyticsModel.query
  ): Promise<AnalyticsModel.overview> {
    const from = parseDate(query.from, "from");
    const to = parseDate(query.to, "to");
    validateRange(from, to);

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

  static async getTimeseries(
    organizationId: string,
    query: AnalyticsModel.timeseriesQuery
  ): Promise<AnalyticsModel.timeseries> {
    const from = parseDate(query.from, "from");
    const to = parseDate(query.to, "to");
    validateRange(from, to);

    const interval: TimeseriesInterval = query.interval ?? "1h";
    const bucketSeconds = INTERVAL_SECONDS[interval];

    const where = and(
      eq(event.organizationId, organizationId),
      from ? gte(delivery.createdAt, from) : undefined,
      to ? lte(delivery.createdAt, to) : undefined
    );

    const bucketTs = sql<Date>`to_timestamp(floor(extract(epoch from ${delivery.createdAt}) / ${bucketSeconds}) * ${bucketSeconds})`;

    const rows = await db
      .select({
        bucket: bucketTs,
        deliveries: sql<number>`count(*)::int`,
        delivered: sql<number>`sum(case when ${delivery.status} = 'delivered' then 1 else 0 end)::int`,
        failed: sql<number>`sum(case when ${delivery.status} = 'failed' then 1 else 0 end)::int`,
        retries: sql<number>`sum(case when ${delivery.attempts} > 1 then 1 else 0 end)::int`,
        circuitOpen: sql<number>`sum(case when ${delivery.status} = 'circuit_open' then 1 else 0 end)::int`,
      })
      .from(delivery)
      .innerJoin(event, eq(delivery.eventId, event.id))
      .where(where)
      .groupBy(bucketTs)
      .orderBy(bucketTs);

    return {
      interval,
      buckets: rows.map((row) => ({
        ts: row.bucket.toISOString(),
        deliveries: row.deliveries ?? 0,
        delivered: row.delivered ?? 0,
        failed: row.failed ?? 0,
        retries: row.retries ?? 0,
        circuitOpen: row.circuitOpen ?? 0,
      })),
    };
  }

  static async getRetries(
    organizationId: string,
    query: AnalyticsModel.query
  ): Promise<AnalyticsModel.retries> {
    const from = parseDate(query.from, "from");
    const to = parseDate(query.to, "to");
    validateRange(from, to);

    const deliveryWhere = and(
      eq(event.organizationId, organizationId),
      from ? gte(delivery.createdAt, from) : undefined,
      to ? lte(delivery.createdAt, to) : undefined
    );

    const attemptWhere = and(
      eq(deliveryAttempt.organizationId, organizationId),
      from ? gte(deliveryAttempt.createdAt, from) : undefined,
      to ? lte(deliveryAttempt.createdAt, to) : undefined
    );

    const [totals] = await db
      .select({
        deliveries: sql<number>`count(*)::int`,
        deliveriesWithRetry: sql<number>`sum(case when ${delivery.attempts} > 1 then 1 else 0 end)::int`,
        recoveredAfterRetry: sql<number>`sum(case when ${delivery.status} = 'delivered' and ${delivery.attempts} > 1 then 1 else 0 end)::int`,
        exhaustedRetries: sql<number>`sum(case when ${delivery.status} = 'failed' and ${delivery.attempts} > 1 then 1 else 0 end)::int`,
        firstAttemptSuccesses: sql<number>`sum(case when ${delivery.status} = 'delivered' and ${delivery.attempts} = 1 then 1 else 0 end)::int`,
        avgAttempts: sql<number>`coalesce(avg(${delivery.attempts})::float, 0)`,
      })
      .from(delivery)
      .innerJoin(event, eq(delivery.eventId, event.id))
      .where(deliveryWhere);

    const rows = await db
      .select({
        attemptNumber: deliveryAttempt.attemptNumber,
        total: sql<number>`count(*)::int`,
        successes: sql<number>`sum(case when ${deliveryAttempt.outcome} = 'success' then 1 else 0 end)::int`,
        failures: sql<number>`sum(case when ${deliveryAttempt.outcome} = 'failure' then 1 else 0 end)::int`,
      })
      .from(deliveryAttempt)
      .where(attemptWhere)
      .groupBy(deliveryAttempt.attemptNumber)
      .orderBy(deliveryAttempt.attemptNumber);

    const deliveries = totals?.deliveries ?? 0;
    const firstAttemptSuccesses = totals?.firstAttemptSuccesses ?? 0;
    const deliveriesWithRetry = totals?.deliveriesWithRetry ?? 0;
    const recoveredAfterRetry = totals?.recoveredAfterRetry ?? 0;
    const avgAttempts = totals?.avgAttempts ?? 0;

    return {
      totals: {
        deliveries,
        deliveriesWithRetry,
        recoveredAfterRetry,
        exhaustedRetries: totals?.exhaustedRetries ?? 0,
      },
      rates: {
        firstAttemptSuccessRate:
          deliveries > 0 ? roundRate(firstAttemptSuccesses / deliveries) : 0,
        retryRate:
          deliveries > 0 ? roundRate(deliveriesWithRetry / deliveries) : 0,
        recoveredAfterRetryRate:
          deliveriesWithRetry > 0
            ? roundRate(recoveredAfterRetry / deliveriesWithRetry)
            : 0,
        averageAttemptsPerDelivery: roundValue(avgAttempts),
      },
      byAttemptNumber: rows.map((row) => ({
        attemptNumber: row.attemptNumber,
        total: row.total ?? 0,
        successes: row.successes ?? 0,
        failures: row.failures ?? 0,
      })),
    };
  }
}
