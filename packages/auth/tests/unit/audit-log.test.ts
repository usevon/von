import { beforeEach, describe, expect, mock, test } from "bun:test";

type InsertedRow = Record<string, unknown>;

const insertedRows: InsertedRow[] = [];

const mockInsert = (row: InsertedRow) => {
  insertedRows.push(row);
  return Promise.resolve();
};

mock.module("@usevon/db", () => ({
  db: {
    insert: () => ({
      values: (row: InsertedRow) => mockInsert(row),
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ plan: "hobby" }]),
        }),
      }),
    }),
  },
  eq: () => ({}),
}));

mock.module("@usevon/db/schema", () => ({
  auditLog: {},
  organization: {},
}));

const { auditLog } = await import("../../src/plugins/audit-log/index");

const BASE_API_KEY = {
  id: "key_001",
  name: "Test Key",
  start: "von_dev_test",
  userId: "user_001",
  organizationId: "org_001",
  environment: "dev",
  scopes: ["read:webhooks"],
  enabled: true,
  expiresAt: null,
  lastUsedAt: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
} as const;

const BASE_MEMBER = {
  id: "mem_001",
  organizationId: "org_001",
  userId: "user_001",
  role: "member",
  createdAt: new Date("2025-01-01"),
} as const;

const BASE_USER = {
  id: "user_001",
  email: "alice@example.com",
  name: "Alice",
} as const;

const BASE_ORG = { id: "org_001" } as const;

const BASE_INVITATION = {
  id: "inv_001",
  email: "bob@example.com",
  role: "member",
  organizationId: "org_001",
} as const;

describe("audit log plugin", () => {
  const { apiKeyHooks, organizationHooks } = auditLog();

  beforeEach(() => {
    insertedRows.length = 0;
  });

  describe("apiKeyHooks", () => {
    test("afterCreate writes apikey.created entry", async () => {
      await apiKeyHooks.afterCreate(BASE_API_KEY);

      expect(insertedRows).toHaveLength(1);
      const row = insertedRows[0];
      expect(row?.action).toBe("apikey.created");
      expect(row?.resourceType).toBe("apikey");
      expect(row?.resourceId).toBe("key_001");
      expect(row?.resourceName).toBe("Test Key");
      expect(row?.actorId).toBe("user_001");
      expect(row?.actorType).toBe("user");
      expect(row?.organizationId).toBe("org_001");
      expect(row?.expiresAt).toBeInstanceOf(Date);
      expect((row?.expiresAt as Date).getTime()).toBeGreaterThan(Date.now());
      const meta = row?.metadata as Record<string, unknown>;
      expect(meta?.environment).toBe("dev");
      expect(meta?.scopes).toEqual(["read:webhooks"]);
    });

    test("afterUpdate writes apikey.updated entry", async () => {
      await apiKeyHooks.afterUpdate({ ...BASE_API_KEY, name: "Renamed Key" });

      expect(insertedRows).toHaveLength(1);
      const row = insertedRows[0];
      expect(row?.action).toBe("apikey.updated");
      expect(row?.resourceId).toBe("key_001");
      expect(row?.resourceName).toBe("Renamed Key");
      const meta = row?.metadata as Record<string, unknown>;
      expect(meta?.name).toBe("Renamed Key");
    });

    test("afterDelete writes apikey.deleted entry", async () => {
      await apiKeyHooks.afterDelete(BASE_API_KEY);

      expect(insertedRows).toHaveLength(1);
      const row = insertedRows[0];
      expect(row?.action).toBe("apikey.deleted");
      expect(row?.resourceId).toBe("key_001");
      expect(row?.resourceName).toBe("Test Key");
    });

    test("skips write when key has no organizationId", async () => {
      await apiKeyHooks.afterCreate({ ...BASE_API_KEY, organizationId: null });
      expect(insertedRows).toHaveLength(0);
    });

    test("expiresAt is 3 days out for hobby plan", async () => {
      await apiKeyHooks.afterCreate(BASE_API_KEY);

      const row = insertedRows[0];
      const expiresAt = (row?.expiresAt as Date).getTime();
      const expectedMin = Date.now() + 2 * 86_400_000;
      const expectedMax = Date.now() + 4 * 86_400_000;
      expect(expiresAt).toBeGreaterThan(expectedMin);
      expect(expiresAt).toBeLessThan(expectedMax);
    });

    test("never throws when db insert fails", async () => {
      const { apiKeyHooks: badHooks } = auditLog({
        getRetentionDays: () => Promise.reject(new Error("db down")),
      });
      await expect(badHooks.afterCreate(BASE_API_KEY)).resolves.toBeUndefined();
    });
  });

  describe("organizationHooks", () => {
    test("afterAddMember writes member.added entry", async () => {
      await organizationHooks.afterAddMember({
        member: BASE_MEMBER,
        user: BASE_USER,
        organization: BASE_ORG,
      });

      expect(insertedRows).toHaveLength(1);
      const row = insertedRows[0];
      expect(row?.action).toBe("member.added");
      expect(row?.resourceType).toBe("member");
      expect(row?.resourceId).toBe("mem_001");
      expect(row?.resourceName).toBe("alice@example.com");
      expect(row?.actorId).toBe("user_001");
      expect(row?.organizationId).toBe("org_001");
      const meta = row?.metadata as Record<string, unknown>;
      expect(meta?.role).toBe("member");
      expect(meta?.email).toBe("alice@example.com");
    });

    test("afterRemoveMember writes member.removed entry", async () => {
      await organizationHooks.afterRemoveMember({
        member: BASE_MEMBER,
        user: BASE_USER,
        organization: BASE_ORG,
      });

      expect(insertedRows).toHaveLength(1);
      const row = insertedRows[0];
      expect(row?.action).toBe("member.removed");
      expect(row?.resourceId).toBe("mem_001");
    });

    test("afterUpdateMemberRole writes member.role_changed entry with previous role", async () => {
      await organizationHooks.afterUpdateMemberRole({
        member: { ...BASE_MEMBER, role: "admin" },
        previousRole: "member",
        user: BASE_USER,
        organization: BASE_ORG,
      });

      expect(insertedRows).toHaveLength(1);
      const row = insertedRows[0];
      expect(row?.action).toBe("member.role_changed");
      const meta = row?.metadata as Record<string, unknown>;
      expect(meta?.previousRole).toBe("member");
      expect(meta?.newRole).toBe("admin");
      expect(meta?.email).toBe("alice@example.com");
    });

    test("afterCreateInvitation writes invitation.created entry", async () => {
      await organizationHooks.afterCreateInvitation({
        invitation: BASE_INVITATION,
        inviter: BASE_USER,
        organization: BASE_ORG,
      });

      expect(insertedRows).toHaveLength(1);
      const row = insertedRows[0];
      expect(row?.action).toBe("invitation.created");
      expect(row?.resourceType).toBe("invitation");
      expect(row?.resourceId).toBe("inv_001");
      expect(row?.resourceName).toBe("bob@example.com");
      expect(row?.actorId).toBe("user_001");
      const meta = row?.metadata as Record<string, unknown>;
      expect(meta?.email).toBe("bob@example.com");
      expect(meta?.role).toBe("member");
    });

    test("afterAcceptInvitation writes invitation.accepted entry", async () => {
      await organizationHooks.afterAcceptInvitation({
        invitation: BASE_INVITATION,
        member: BASE_MEMBER,
        user: BASE_USER,
        organization: BASE_ORG,
      });

      expect(insertedRows).toHaveLength(1);
      const row = insertedRows[0];
      expect(row?.action).toBe("invitation.accepted");
      expect(row?.actorId).toBe("user_001");
      expect(row?.resourceName).toBe("bob@example.com");
    });

    test("afterRejectInvitation writes invitation.rejected entry", async () => {
      await organizationHooks.afterRejectInvitation({
        invitation: BASE_INVITATION,
        user: BASE_USER,
        organization: BASE_ORG,
      });

      expect(insertedRows).toHaveLength(1);
      const row = insertedRows[0];
      expect(row?.action).toBe("invitation.rejected");
    });

    test("afterCancelInvitation writes invitation.cancelled entry using cancelledBy", async () => {
      await organizationHooks.afterCancelInvitation({
        invitation: BASE_INVITATION,
        cancelledBy: { ...BASE_USER, id: "user_002" },
        organization: BASE_ORG,
      });

      expect(insertedRows).toHaveLength(1);
      const row = insertedRows[0];
      expect(row?.action).toBe("invitation.cancelled");
      expect(row?.actorId).toBe("user_002");
    });
  });
});
