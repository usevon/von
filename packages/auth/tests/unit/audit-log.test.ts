import { beforeEach, describe, expect, test } from "bun:test";
import { auditLog } from "../../src/plugins/audit-log/index";
import type { AuditLogInserter } from "../../src/plugins/audit-log/writer";

type InsertedRow = Parameters<AuditLogInserter>[0];

const createFakeInserter = () => {
  const rows: InsertedRow[] = [];
  const inserter: AuditLogInserter = (row) => {
    rows.push(row);
    return Promise.resolve();
  };
  return { rows, inserter };
};

const RETENTION_DAYS = 3;

const fakeOpts = {
  getRetentionDays: () => Promise.resolve(RETENTION_DAYS),
};

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
  let rows: InsertedRow[];
  let inserter: AuditLogInserter;
  let apiKeyHooks: ReturnType<typeof auditLog>["apiKeyHooks"];
  let organizationHooks: ReturnType<typeof auditLog>["organizationHooks"];

  beforeEach(() => {
    ({ rows, inserter } = createFakeInserter());
    ({ apiKeyHooks, organizationHooks } = auditLog(fakeOpts, inserter));
  });

  describe("apiKeyHooks", () => {
    test("afterCreate writes apikey.created entry", async () => {
      await apiKeyHooks.afterCreate(BASE_API_KEY);

      expect(rows).toHaveLength(1);
      const row = rows[0];
      expect(row?.action).toBe("apikey.created");
      expect(row?.resourceType).toBe("apikey");
      expect(row?.resourceId).toBe("key_001");
      expect(row?.resourceName).toBe("Test Key");
      expect(row?.actorId).toBe("user_001");
      expect(row?.actorType).toBe("user");
      expect(row?.organizationId).toBe("org_001");
      expect(row?.expiresAt).toBeInstanceOf(Date);
      expect(row?.expiresAt.getTime()).toBeGreaterThan(Date.now());
      const meta = row?.metadata as Record<string, unknown>;
      expect(meta?.environment).toBe("dev");
      expect(meta?.scopes).toEqual(["read:webhooks"]);
    });

    test("skips write when key has no organizationId", async () => {
      await apiKeyHooks.afterCreate({ ...BASE_API_KEY, organizationId: null });
      expect(rows).toHaveLength(0);
    });

    test("expiresAt is set to retention window from now", async () => {
      await apiKeyHooks.afterCreate(BASE_API_KEY);

      const expiresAt = rows[0]?.expiresAt.getTime() ?? 0;
      const expectedMs = RETENTION_DAYS * 86_400_000;
      expect(expiresAt).toBeGreaterThan(Date.now() + expectedMs - 5000);
      expect(expiresAt).toBeLessThan(Date.now() + expectedMs + 5000);
    });

    test("never throws when inserter fails", async () => {
      const failingInserter: AuditLogInserter = () =>
        Promise.reject(new Error("db down"));
      const { apiKeyHooks: badHooks } = auditLog(fakeOpts, failingInserter);
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

      expect(rows).toHaveLength(1);
      const row = rows[0];
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

    test("afterUpdateMemberRole writes member.role_changed with previous and new role", async () => {
      await organizationHooks.afterUpdateMemberRole({
        member: { ...BASE_MEMBER, role: "admin" },
        previousRole: "member",
        user: BASE_USER,
        organization: BASE_ORG,
      });

      expect(rows).toHaveLength(1);
      const row = rows[0];
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

      expect(rows).toHaveLength(1);
      const row = rows[0];
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

      expect(rows).toHaveLength(1);
      const row = rows[0];
      expect(row?.action).toBe("invitation.accepted");
      expect(row?.actorId).toBe("user_001");
      expect(row?.resourceName).toBe("bob@example.com");
    });

    test("afterCancelInvitation uses cancelledBy as actorId", async () => {
      await organizationHooks.afterCancelInvitation({
        invitation: BASE_INVITATION,
        cancelledBy: { ...BASE_USER, id: "user_002" },
        organization: BASE_ORG,
      });

      expect(rows).toHaveLength(1);
      const row = rows[0];
      expect(row?.action).toBe("invitation.cancelled");
      expect(row?.actorId).toBe("user_002");
    });
  });

  test("each mutation hook writes a row with its action string", async () => {
    const cases: [string, () => Promise<void>][] = [
      ["apikey.updated", () => apiKeyHooks.afterUpdate(BASE_API_KEY)],
      ["apikey.deleted", () => apiKeyHooks.afterDelete(BASE_API_KEY)],
      [
        "member.removed",
        () =>
          organizationHooks.afterRemoveMember({
            member: BASE_MEMBER,
            user: BASE_USER,
            organization: BASE_ORG,
          }),
      ],
      [
        "invitation.rejected",
        () =>
          organizationHooks.afterRejectInvitation({
            invitation: BASE_INVITATION,
            user: BASE_USER,
            organization: BASE_ORG,
          }),
      ],
    ];

    for (const [action, run] of cases) {
      rows.length = 0;
      await run();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.action).toBe(action);
    }
  });
});
