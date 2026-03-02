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
}
