import { eq, and } from "drizzle-orm"
import { db } from "@usevon/db"
import { webhookVersion } from "@usevon/db/schema"
import { InternalServerError } from "@/lib/errors"
import type { VersionModel } from "./model"

type TransformMappings = {
  rename?: Record<string, string>
  remove?: string[]
  defaults?: Record<string, unknown>
}

type Transforms = Record<string, TransformMappings>

type VersionFields = {
  version: string
  transforms: Transforms
}

type CreateVersionParams = VersionFields & { organizationId: string }
type UpdateVersionParams = Pick<VersionFields, "transforms"> & { organizationId: string; version: string }

const toVersion = (v: typeof webhookVersion.$inferSelect): VersionModel.webhookVersion => ({
  id: v.id,
  version: v.version,
  transforms: v.transforms as Transforms,
  createdAt: v.createdAt.toISOString(),
  updatedAt: v.updatedAt.toISOString(),
})

export abstract class VersionService {
  static async create(params: CreateVersionParams): Promise<VersionModel.webhookVersion> {
    try {
      const now = new Date()

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
        .returning()

      if (!result[0]) throw new Error("Failed to create version")
      return toVersion(result[0])
    } catch (error) {
      console.error("Error creating version:", error)
      throw new InternalServerError("Failed to create version")
    }
  }

  static async getAll(
    organizationId: string,
    limit: number,
    offset: number
  ): Promise<VersionModel.versionList> {
    try {
      const versions = await db
        .select()
        .from(webhookVersion)
        .where(eq(webhookVersion.organizationId, organizationId))

      return {
        versions: versions.slice(offset, offset + limit).map(toVersion),
        total: versions.length,
      }
    } catch (error) {
      console.error("Error fetching versions:", error)
      throw new InternalServerError("Failed to fetch versions")
    }
  }

  static async getByVersion(
    organizationId: string,
    version: string
  ): Promise<VersionModel.webhookVersion | null> {
    try {
      const result = await db
        .select()
        .from(webhookVersion)
        .where(
          and(
            eq(webhookVersion.version, version),
            eq(webhookVersion.organizationId, organizationId)
          )
        )
        .limit(1)

      if (!result[0]) return null
      return toVersion(result[0])
    } catch (error) {
      console.error("Error fetching version:", error)
      throw new InternalServerError("Failed to fetch version")
    }
  }

  static async update(params: UpdateVersionParams): Promise<VersionModel.webhookVersion | null> {
    try {
      const existing = await db
        .select()
        .from(webhookVersion)
        .where(
          and(
            eq(webhookVersion.version, params.version),
            eq(webhookVersion.organizationId, params.organizationId)
          )
        )
        .limit(1)

      if (!existing[0]) return null

      const result = await db
        .update(webhookVersion)
        .set({
          transforms: params.transforms,
          updatedAt: new Date(),
        })
        .where(eq(webhookVersion.id, existing[0].id))
        .returning()

      if (!result[0]) throw new Error("Failed to update version")
      return toVersion(result[0])
    } catch (error) {
      console.error("Error updating version:", error)
      throw new InternalServerError("Failed to update version")
    }
  }

  static async delete(organizationId: string, version: string): Promise<boolean> {
    try {
      const result = await db
        .delete(webhookVersion)
        .where(
          and(
            eq(webhookVersion.version, version),
            eq(webhookVersion.organizationId, organizationId)
          )
        )
        .returning({ id: webhookVersion.id })

      return result.length > 0
    } catch (error) {
      console.error("Error deleting version:", error)
      throw new InternalServerError("Failed to delete version")
    }
  }
}
