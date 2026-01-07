import { db } from "@usevon/db";
import { webhookVersion } from "@usevon/db/schema";
import { generateId, type Transforms, toISODates } from "@usevon/utils";
import { and, eq } from "drizzle-orm";
import { withServiceError } from "@/lib/service-utils";
import type { VersionModel } from "@/modules/versions/model";

type VersionFields = {
  version: string;
  transforms: Transforms;
};

type CreateVersionParams = VersionFields & { organizationId: string };
type UpdateVersionParams = Pick<VersionFields, "transforms"> & {
  organizationId: string;
  version: string;
};

export abstract class VersionService {
  static create(
    params: CreateVersionParams
  ): Promise<VersionModel.webhookVersion> {
    return withServiceError(async () => {
      const now = new Date();

      const result = await db
        .insert(webhookVersion)
        .values({
          id: generateId(),
          organizationId: params.organizationId,
          version: params.version,
          transforms: params.transforms,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!result[0]) {
        throw new Error("Failed to create version");
      }
      return toISODates(result[0]) as VersionModel.webhookVersion;
    }, "creating version");
  }

  static getAll(
    organizationId: string,
    limit: number,
    offset: number
  ): Promise<VersionModel.versionList> {
    return withServiceError(async () => {
      const [versions, total] = await Promise.all([
        db
          .select()
          .from(webhookVersion)
          .where(eq(webhookVersion.organizationId, organizationId))
          .limit(limit)
          .offset(offset),
        db.$count(
          webhookVersion,
          eq(webhookVersion.organizationId, organizationId)
        ),
      ]);
      return { versions: versions.map((v) => toISODates(v) as VersionModel.webhookVersion), total };
    }, "fetching versions");
  }

  static getByVersion(
    organizationId: string,
    version: string
  ): Promise<VersionModel.webhookVersion | null> {
    return withServiceError(async () => {
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

      return result[0] ? toISODates(result[0]) as VersionModel.webhookVersion : null;
    }, "fetching version");
  }

  static update(
    params: UpdateVersionParams
  ): Promise<VersionModel.webhookVersion | null> {
    return withServiceError(async () => {
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
        throw new Error("Failed to update version");
      }
      return toISODates(result[0]) as VersionModel.webhookVersion;
    }, "updating version");
  }

  static delete(organizationId: string, version: string): Promise<boolean> {
    return withServiceError(async () => {
      const result = await db
        .delete(webhookVersion)
        .where(
          and(
            eq(webhookVersion.version, version),
            eq(webhookVersion.organizationId, organizationId)
          )
        )
        .returning({ id: webhookVersion.id });

      return result.length > 0;
    }, "deleting version");
  }
}
