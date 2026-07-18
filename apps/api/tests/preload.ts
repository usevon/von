import { mock } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = [
  resolve(import.meta.dir, "../.env"),
  resolve(import.meta.dir, "../.env.test"),
  resolve(import.meta.dir, "../.env.test.example"),
].find((candidate) => existsSync(candidate));

if (envPath) {
  const envFile = Bun.file(envPath);
  const envContent = await envFile.text();

  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const [key, ...valueParts] = trimmed.split("=");
    if (key && process.env[key] === undefined) {
      process.env[key] = valueParts.join("=");
    }
  }
}

process.env.NODE_ENV ??= "test";
process.env.BETTER_AUTH_SECRET ??= "test-secret-minimum-32-characters-long!!";
process.env.API_KEY_SIGNING_SECRET ??= "test-signing-secret";

const isIntegration = process.argv.some((a) => a.includes("integration"));

if (!isIntegration) {
  const sets = new Map<string, Set<string>>();
  const strings = new Map<string, string>();

  const noopRedis = {
    eval: () => Promise.resolve([1, 0]),
    defineCommand(name: string, _opts: unknown) {
      (this as Record<string, unknown>)[name] = () => Promise.resolve(1);
    },
    get: (k: string) => Promise.resolve(strings.get(k) ?? null),
    set: (k: string, v: string) => {
      strings.set(k, v);
      return Promise.resolve("OK");
    },
    setex: (k: string, _ttl: number, v: string) => {
      strings.set(k, v);
      return Promise.resolve("OK");
    },
    del: (k: string) => {
      const had = strings.delete(k) || sets.delete(k);
      return Promise.resolve(had ? 1 : 0);
    },
    sadd: (k: string, v: string) => {
      const s = sets.get(k) ?? new Set<string>();
      const added = s.has(v) ? 0 : 1;
      s.add(v);
      sets.set(k, s);
      return Promise.resolve(added);
    },
    srem: (k: string, v: string) => {
      const s = sets.get(k);
      if (!s?.has(v)) {
        return Promise.resolve(0);
      }
      s.delete(v);
      if (s.size === 0) {
        sets.delete(k);
      }
      return Promise.resolve(1);
    },
    smembers: (k: string) =>
      Promise.resolve([...(sets.get(k) ?? new Set<string>())]),
    scard: (k: string) => Promise.resolve(sets.get(k)?.size ?? 0),
    expire: () => Promise.resolve(1),
    publish: () => Promise.resolve(1),
    pipeline: () => ({
      get: () => undefined,
      exec: () => Promise.resolve([]),
    }),
    xadd: () => Promise.resolve("0-0"),
    xrange: () => Promise.resolve([]),
    xreadgroup: () => Promise.resolve(null),
    xack: () => Promise.resolve(0),
    xdel: () => Promise.resolve(0),
    xgroup: () => Promise.resolve("OK"),
    spop: () => Promise.resolve([]),
    subscribe: () => Promise.resolve(1),
    on: () => noopRedis,
    unsubscribe: () => Promise.resolve(1),
    quit: () => Promise.resolve("OK"),
  };

  mock.module("@usevon/queue", () => ({
    getRedisClient: () => noopRedis,
    checkRedisConnection: () => Promise.resolve({ ok: true }),
    closeRedis: () => Promise.resolve(),
    createConnection: () => noopRedis,
    setnx: () => Promise.resolve(true),
    reserveAndBuffer: () =>
      Promise.resolve({ allowed: true, currentUsage: 1, streamId: "0-0" }),
    cacheGet: () => Promise.resolve(null),
    cacheSet: () => Promise.resolve(),
    cacheDel: () => Promise.resolve(),
    checkThroughputLimit: () => Promise.resolve({ allowed: true, remaining: 24 }),
    getPlanLimits: (plan: string) =>
      plan === "hobby"
        ? { ratePerSecond: 25, burstPerSecond: 35 }
        : { ratePerSecond: 100, burstPerSecond: 140 },
    getWebhookDeliveryQueue: () => ({
      addBulk: () => Promise.resolve([]),
      add: () => Promise.resolve({}),
    }),
    getInboundForwardingQueue: () => ({
      addBulk: () => Promise.resolve([]),
      add: () => Promise.resolve({}),
    }),
  }));

  const noopPrepared = { execute: () => Promise.resolve([]) };
  const noopQuery = Object.assign(() => noopQuery, {
    select: () => noopQuery,
    from: () => noopQuery,
    where: () => noopQuery,
    limit: () => noopQuery,
    offset: () => noopQuery,
    orderBy: () => noopQuery,
    leftJoin: () => noopQuery,
    innerJoin: () => noopQuery,
    groupBy: () => noopQuery,
    insert: () => noopQuery,
    values: () => noopQuery,
    returning: () => Promise.resolve([]),
    update: () => noopQuery,
    set: () => noopQuery,
    delete: () => noopQuery,
    prepare: () => noopPrepared,
    then: (cb: (v: unknown[]) => void) => cb([]),
    execute: () => Promise.resolve([]),
    query: {},
  });

  const noopSql = Object.assign(() => "", { placeholder: () => "" });

  mock.module("@usevon/db", () => ({
    db: noopQuery,
    checkDatabaseConnection: () => Promise.resolve({ ok: true }),
    closeDatabase: () => Promise.resolve(),
    eq: (...args: unknown[]) => args,
    and: (...args: unknown[]) => args,
    inArray: (...args: unknown[]) => args,
    or: (...args: unknown[]) => args,
    sql: noopSql,
  }));

  const noop = () => null;
  mock.module("@usevon/email", () => ({
    render: noop,
    WelcomeEmail: noop,
    InvitationEmail: noop,
    PasswordResetEmail: noop,
    VerificationEmail: noop,
    QuotaWarningEmail: noop,
    FailureAlertEmail: noop,
    EmailChangedEmail: noop,
    PlanChangedEmail: noop,
    EndpointDisabledEmail: noop,
    EndpointRecoveredEmail: noop,
  }));
}
