import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const PRIVATE_IPV4_RANGES: [number, number][] = [
  [0x00_00_00_00, 0x00_ff_ff_ff],
  [0x0a_00_00_00, 0x0a_ff_ff_ff],
  [0x64_40_00_00, 0x64_7f_ff_ff],
  [0x7f_00_00_00, 0x7f_ff_ff_ff],
  [0xa9_fe_00_00, 0xa9_fe_ff_ff],
  [0xac_10_00_00, 0xac_1f_ff_ff],
  [0xc0_a8_00_00, 0xc0_a8_ff_ff],
  [0xc6_12_00_00, 0xc6_13_ff_ff],
  [0xe0_00_00_00, 0xff_ff_ff_ff],
];

const PRIVATE_IPV6_PATTERNS = [
  /^::$/i,
  /^::1$/i,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe[89ab][0-9a-f]:/i,
  /^ff[0-9a-f]{2}:/i,
  /^fd00:ec2::254$/i,
];

const BLOCKED_HOSTNAMES = [
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "metadata.azure.com",
];

const normalizeAddress = (value: string): string => {
  const unwrapped = value.startsWith("[") ? value.slice(1, -1) : value;
  const zoneIndex = unwrapped.indexOf("%");
  return zoneIndex === -1 ? unwrapped : unwrapped.slice(0, zoneIndex);
};

const ipv4ToInt = (ip: string): number => {
  const parts = ip.split(".").map((p) => Number(p));
  if (
    parts.length !== 4 ||
    parts.some(
      (p) => Number.isNaN(p) || !Number.isInteger(p) || p < 0 || p > 255
    )
  ) {
    return -1;
  }

  const [a, b, c, d] = parts;
  if (
    a === undefined ||
    b === undefined ||
    c === undefined ||
    d === undefined
  ) {
    return -1;
  }

  return a * 256 ** 3 + b * 256 ** 2 + c * 256 + d;
};

const isPrivateIPv4 = (ip: string): boolean => {
  const normalized = normalizeAddress(ip);
  const value = ipv4ToInt(normalized);
  if (value < 0) {
    return true;
  }
  return PRIVATE_IPV4_RANGES.some(
    ([start, end]) => value >= start && value <= end
  );
};

const isPrivateIPv6 = (ip: string): boolean => {
  const normalized = normalizeAddress(ip).toLowerCase();
  if (normalized.startsWith("::ffff:")) {
    return isPrivateIPv4(normalized.slice("::ffff:".length));
  }
  return PRIVATE_IPV6_PATTERNS.some((pattern) => pattern.test(normalized));
};

const isPrivateIP = (hostOrIp: string): boolean => {
  const normalized = normalizeAddress(hostOrIp);
  const ipVersion = isIP(normalized);

  if (ipVersion === 4) {
    return isPrivateIPv4(normalized);
  }

  if (ipVersion === 6) {
    return isPrivateIPv6(normalized);
  }

  if (BLOCKED_HOSTNAMES.some((h) => normalized.toLowerCase() === h)) {
    return true;
  }

  return false;
};

const isBlockedHostname = (hostname: string): boolean => {
  const lower = hostname.toLowerCase();
  return BLOCKED_HOSTNAMES.some((h) => lower === h || lower.endsWith(`.${h}`));
};

export const isValidWebhookUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }
    if (isBlockedHostname(parsed.hostname)) {
      return false;
    }
    if (isPrivateIP(parsed.hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

export const isSafeWebhookUrl = async (url: string): Promise<boolean> => {
  try {
    const parsed = new URL(url);
    if (!isValidWebhookUrl(url)) {
      return false;
    }

    const records = await lookup(parsed.hostname, {
      all: true,
      verbatim: true,
    });

    if (records.length === 0) {
      return false;
    }

    return records.every((record) => !isPrivateIP(record.address));
  } catch {
    return false;
  }
};
