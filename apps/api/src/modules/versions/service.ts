import { db } from "@usevon/db";
import { webhookVersion } from "@usevon/db/schema";
import { getRedisClient } from "@usevon/queue";
import type { TransformMappings, WebhookVersion } from "@usevon/types";
import { InternalServerError, type Transforms } from "@usevon/utils";
import { and, desc, eq } from "drizzle-orm";
import {
  buildCursorCondition,
  buildCursorScopeHash,
  decodeCursor,
  encodeCursor,
  sliceCursorPage,
  type CursorPageInput,
} from "@/lib/pagination";
import type { VersionModel } from "@/modules/versions/model";

type VersionRow = typeof webhookVersion.$inferSelect;

const toResponse = (row: VersionRow): WebhookVersion => ({
  id: row.id,
  version: row.version,
  transforms: row.transforms as Record<string, TransformMappings>,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

type VersionFields = {
  version: string;
  transforms: Transforms;
};

type CreateVersionParams = VersionFields & { organizationId: string };
type UpdateVersionParams = Pick<VersionFields, "transforms"> & {
  organizationId: string;
  version: string;
};

const redis = getRedisClient();
const VERSION_CURSOR_SORT = "desc" as const;

export abstract class VersionService {
  static async create(
    params: CreateVersionParams
  ): Promise<VersionModel.webhookVersion> {
    const now = new Date();

    const result = await db
      .insert(webhookVersion)
      .values({
        id: crypto.randomUUID(),
        organizationId: params.organizationId,
        version: params.version,
        transforms: params.transforms,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!result[0]) {
      throw new InternalServerError();
    }
    return toResponse(result[0]);
  }

  static async getAll(
    organizationId: string,
    pagination: CursorPageInput
  ): Promise<VersionModel.versionList> {
    const scopeHash = buildCursorScopeHash({
      resource: "webhook-versions",
      organizationId,
    });

    const cursor = decodeCursor(pagination.cursor, {
      sort: VERSION_CURSOR_SORT,
      scopeHash,
    });

    const baseCondition = eq(webhookVersion.organizationId, organizationId);
    const where = cursor
      ? and(
          baseCondition,
          buildCursorCondition(
            webhookVersion.createdAt,
            webhookVersion.id,
            cursor,
            VERSION_CURSOR_SORT
          )
        )
      : baseCondition;

    const rows = await db
      .select()
      .from(webhookVersion)
      .where(where)
      .orderBy(desc(webhookVersion.createdAt), desc(webhookVersion.id))
      .limit(pagination.limit + 1);

    const { items, hasMore, lastItem } = sliceCursorPage(
      rows,
      pagination.limit
    );

    return {
      versions: items.map((v) => toResponse(v)),
      nextCursor:
        hasMore && lastItem
          ? encodeCursor({
              createdAt: lastItem.createdAt,
              id: lastItem.id,
              sort: VERSION_CURSOR_SORT,
              scopeHash,
            })
          : null,
    };
  }

  static async getByVersion(
    organizationId: string,
    version: string
  ): Promise<VersionModel.webhookVersion | null> {
    const result = await db
      .select()
      .from(webhookVersion)
      .where(
        and(
          eq(webhookVersion.version, version),
          eq(webhookVersion.organizationId, organizationId)
        )
      )
      .limit(1);

    return result[0] ? toResponse(result[0]) : null;
  }

  static async update(
    params: UpdateVersionParams
  ): Promise<VersionModel.webhookVersion | null> {
    const existing = await db
      .select()
      .from(webhookVersion)
      .where(
        and(
          eq(webhookVersion.version, params.version),
          eq(webhookVersion.organizationId, params.organizationId)
        )
      )
      .limit(1);

    if (!existing[0]) {
      return null;
    }

    const result = await db
      .update(webhookVersion)
      .set({
        transforms: params.transforms,
        updatedAt: new Date(),
      })
      .where(eq(webhookVersion.id, existing[0].id))
      .returning();

    if (!result[0]) {
      throw new InternalServerError();
    }
    await redis.del(`version:${params.organizationId}:${params.version}`);
    return toResponse(result[0]);
  }

  static async delete(
    organizationId: string,
    version: string
  ): Promise<boolean> {
    const result = await db
      .delete(webhookVersion)
      .where(
        and(
          eq(webhookVersion.version, version),
          eq(webhookVersion.organizationId, organizationId)
        )
      )
      .returning({ id: webhookVersion.id });

    if (result.length > 0) {
      await redis.del(`version:${organizationId}:${version}`);
    }
    return result.length > 0;
  }
}
