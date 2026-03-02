import { t } from "elysia";

export namespace AnalyticsModel {
  export const query = t.Object({
    from: t.Optional(t.String()),
    to: t.Optional(t.String()),
  });

  export type query = typeof query.static;

  export const overview = t.Object({
    totals: t.Object({
      events: t.Number(),
      deliveries: t.Number(),
      delivered: t.Number(),
      failed: t.Number(),
      pending: t.Number(),
      paused: t.Number(),
      skipped: t.Number(),
      circuitOpen: t.Number(),
    }),
    rates: t.Object({
      successRate: t.Number(),
      failureRate: t.Number(),
      retryRate: t.Number(),
    }),
  });

  export type overview = typeof overview.static;

  export const interval = t.Union([
    t.Literal("5m"),
    t.Literal("15m"),
    t.Literal("1h"),
    t.Literal("1d"),
  ]);

  export const timeseriesQuery = t.Object({
    from: t.Optional(t.String()),
    to: t.Optional(t.String()),
    interval: t.Optional(interval),
  });

  export type timeseriesQuery = typeof timeseriesQuery.static;

  export const timeseriesBucket = t.Object({
    ts: t.String(),
    deliveries: t.Number(),
    delivered: t.Number(),
    failed: t.Number(),
    retries: t.Number(),
    circuitOpen: t.Number(),
  });

  export const timeseries = t.Object({
    interval,
    buckets: t.Array(timeseriesBucket),
  });

  export type timeseries = typeof timeseries.static;

  export const retriesByAttempt = t.Object({
    attemptNumber: t.Number(),
    total: t.Number(),
    successes: t.Number(),
    failures: t.Number(),
  });

  export const retries = t.Object({
    totals: t.Object({
      deliveries: t.Number(),
      deliveriesWithRetry: t.Number(),
      recoveredAfterRetry: t.Number(),
      exhaustedRetries: t.Number(),
    }),
    rates: t.Object({
      firstAttemptSuccessRate: t.Number(),
      retryRate: t.Number(),
      recoveredAfterRetryRate: t.Number(),
      averageAttemptsPerDelivery: t.Number(),
    }),
    attempts: t.Array(retriesByAttempt),
  });

  export type retries = typeof retries.static;
}
