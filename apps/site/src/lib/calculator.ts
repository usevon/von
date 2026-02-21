export const WEBHOOK_MIN = 10_000;
export const WEBHOOK_MAX = 5_000_000;
export const WEBHOOK_TICKS = [
  10_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000,
];

export const THROUGHPUT_MIN = 25;
export const THROUGHPUT_MAX = 2000;
export const THROUGHPUT_TICKS = [25, 100, 250, 500, 1000, 1500, 2000];

export const RETENTION_MIN = 7;
export const RETENTION_MAX = 90;
export const RETENTION_TICKS = [
  7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 90,
];
export const RETENTION_RATE = 0.04;

export const TEAM_MEMBERS_MIN = 2;
export const TEAM_MEMBERS_MAX = 20;
export const TEAM_MEMBERS_TICKS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
export const TEAM_MEMBER_ADDON = 5;
export const INCLUDED_TEAM_MEMBERS = 1;

export const MIN_PAYG_MONTHLY = 5;
export const CUSTOM_DOMAIN_ADDON = 5;

export const RATE_TIERS = [
  { upTo: 500_000, rate: 1.0 },
  { upTo: 2_000_000, rate: 0.75 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.5 },
] as const;

export const fmt = new Intl.NumberFormat("en-US");

export const fmtCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function formatCompact(v: number) {
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}m`;
  }
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return `${v}`;
}

function roundMoney(v: number) {
  return Math.round(v * 100) / 100;
}

const WEBHOOK_BLOCK = 10_000;
const THROUGHPUT_BLOCK = 25;
const RETENTION_INTERVAL = 7;

export function getGraduatedCost(webhooks: number) {
  let remaining = webhooks,
    cost = 0,
    prev = 0;
  for (const tier of RATE_TIERS) {
    const size =
      tier.upTo === Number.POSITIVE_INFINITY ? remaining : tier.upTo - prev;
    const used = Math.min(remaining, size);
    cost += (used / WEBHOOK_BLOCK) * tier.rate;
    remaining -= used;
    prev = tier.upTo;
    if (remaining <= 0) break;
  }
  return roundMoney(cost);
}

export function getEffectiveRate(webhooks: number) {
  if (webhooks <= 0) return RATE_TIERS[0].rate;
  return roundMoney(getGraduatedCost(webhooks) / (webhooks / WEBHOOK_BLOCK));
}

export function getThroughputAddon(perSec: number) {
  if (perSec <= THROUGHPUT_MIN) return 0;
  return roundMoney(((perSec - THROUGHPUT_MIN) / THROUGHPUT_BLOCK) * 10);
}

export function getRetentionAddon(days: number, webhooks: number) {
  if (days <= RETENTION_MIN || webhooks <= 0) return 0;
  const intervals = Math.ceil((days - RETENTION_MIN) / RETENTION_INTERVAL);
  return roundMoney(
    Math.ceil(webhooks / WEBHOOK_BLOCK) * intervals * RETENTION_RATE
  );
}
