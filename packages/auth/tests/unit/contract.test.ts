// Pins the cross language api key contract that the Rust verifier in von-api depends on.
import { describe, expect, test } from "bun:test";
import { createHash, createHmac } from "node:crypto";
import { memoryAdapter } from "better-auth/adapters/memory";
import { betterAuth } from "better-auth/minimal";
import { apiKey, type ApiKey } from "../../src/plugins/api-key";
import {
  hashKey,
  hmacSign,
  verifySignature,
} from "../../src/plugins/api-key/crypto";

const SECRET = "von-contract-pin-secret";
const RANDOM =
  "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdefghijklmnopqrstuvwxyzAB";
const GOLDEN_SIG = "c2906054f535b460064fd0f5b63e39f3";
const GOLDEN_KEY = `von_dev_${RANDOM}.${GOLDEN_SIG}`;
const GOLDEN_HASH =
  "8f65001b67d20f2959648c9fc2793a363f5e26d2daebbde6926adb884dcd694b";
const KEY_SHAPE = /^von_dev_[A-Za-z0-9]{64}\.[0-9a-f]{32}$/;
const UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("key format golden vectors", () => {
  test("signature bytes are pinned", () => {
    expect(hmacSign(RANDOM, SECRET)).toBe(GOLDEN_SIG);
  });

  test("full key is prefix, 64 char base62 body, dot, 32 hex signature", () => {
    expect(GOLDEN_KEY).toHaveLength(105);
    expect(GOLDEN_KEY).toMatch(KEY_SHAPE);
    expect(verifySignature(GOLDEN_KEY, SECRET)).toBe(true);
  });

  test("stored hash bytes are pinned", () => {
    expect(hashKey(GOLDEN_KEY)).toBe(GOLDEN_HASH);
  });

  test("signature covers the random body only, like the Rust verifier", () => {
    const overBody = createHmac("sha256", SECRET)
      .update(RANDOM)
      .digest("hex")
      .slice(0, 32);
    const overFullKey = createHmac("sha256", SECRET)
      .update(`von_dev_${RANDOM}`)
      .digest("hex")
      .slice(0, 32);
    expect(GOLDEN_SIG).toBe(overBody);
    expect(GOLDEN_SIG).not.toBe(overFullKey);
  });

  test("hash covers the entire raw key including prefix and signature", () => {
    const overFullKey = createHash("sha256").update(GOLDEN_KEY).digest("hex");
    const overBody = createHash("sha256").update(RANDOM).digest("hex");
    expect(hashKey(GOLDEN_KEY)).toBe(overFullKey);
    expect(hashKey(GOLDEN_KEY)).not.toBe(overBody);
  });
});

type MemoryDb = Record<string, Record<string, unknown>[]>;

async function createTestAuth() {
  const db: MemoryDb = {
    user: [],
    session: [],
    account: [],
    verification: [],
    apikey: [],
    member: [],
    organization: [],
  };
  const auth = betterAuth({
    database: memoryAdapter(db),
    secret: "test-secret-at-least-32-characters-long",
    baseURL: "http://localhost:3001",
    emailAndPassword: { enabled: true },
    advanced: { database: { generateId: () => crypto.randomUUID() } },
    plugins: [apiKey({ signingSecret: SECRET })],
  });
  const { headers } = await auth.api.signUpEmail({
    body: { email: "pin@example.com", password: "password-1234", name: "Pin" },
    returnHeaders: true,
  });
  const cookie = headers.get("set-cookie") ?? "";
  return { auth, db, headers: new Headers({ cookie }) };
}

describe("stored apikey row", () => {
  test("create writes the exact row the Rust reader selects from", async () => {
    const { auth, db, headers } = await createTestAuth();
    const created = await auth.api.createApiKey({
      body: { name: "pin", environment: "dev" as const, scopes: ["read:*"] },
      headers,
    });

    const raw = created.key;
    expect(raw).toMatch(KEY_SHAPE);
    expect(verifySignature(raw, SECRET)).toBe(true);

    const row = db.apikey[0] as unknown as ApiKey;
    expect(Object.keys(row).sort()).toEqual([
      "createdAt",
      "enabled",
      "environment",
      "expiresAt",
      "id",
      "key",
      "lastUsedAt",
      "name",
      "organizationId",
      "scopes",
      "start",
      "updatedAt",
      "userId",
    ]);
    expect(row.key).toBe(createHash("sha256").update(raw).digest("hex"));
    expect(row.start).toBe(raw.slice(0, 12));
    expect(row.environment).toBe("dev");
    expect(row.scopes).toEqual(["read:*"]);
    expect(row.enabled).toBe(true);
    expect(row.organizationId).toBeNull();
    expect(row.expiresAt).toBeNull();
    expect(row.lastUsedAt).toBeNull();
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.updatedAt).toBeInstanceOf(Date);
    expect(row.id).toMatch(UUID_SHAPE);
    expect(row.userId).toBe(db.user[0]?.id as string);
  });

  test("environment picks the prefix and is stored as the word", async () => {
    const { auth, db, headers } = await createTestAuth();
    const prefixes = {
      dev: "von_dev_",
      staging: "von_stg_",
      prod: "von_prod_",
    } as const;
    for (const [environment, prefix] of Object.entries(prefixes)) {
      const created = await auth.api.createApiKey({
        body: { name: `pin-${environment}`, environment: environment as never },
        headers,
      });
      expect(created.key.startsWith(prefix)).toBe(true);
      const row = db.apikey.at(-1) as unknown as ApiKey;
      expect(row.environment).toBe(environment);
      expect(row.start).toBe(created.key.slice(0, 12));
    }
  });

  test("omitted scopes are stored as null and expiresAt is a date", async () => {
    const { auth, db, headers } = await createTestAuth();
    await auth.api.createApiKey({
      body: { name: "pin", environment: "dev" as const, expiresIn: 3600 },
      headers,
    });
    const row = db.apikey[0] as unknown as ApiKey;
    expect(row.scopes).toBeNull();
    expect(row.expiresAt).toBeInstanceOf(Date);
    const deltaMs = (row.expiresAt as Date).getTime() - Date.now();
    expect(deltaMs).toBeGreaterThan(3500 * 1000);
    expect(deltaMs).toBeLessThanOrEqual(3600 * 1000);
  });
});
