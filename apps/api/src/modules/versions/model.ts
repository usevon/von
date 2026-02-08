import type { TransformMappings, WebhookVersion } from "@usevon/types";
import { t } from "elysia";

const transformMappings = t.Object({
  rename: t.Optional(t.Record(t.String(), t.String())),
  remove: t.Optional(t.Array(t.String())),
  defaults: t.Optional(t.Record(t.String(), t.Unknown())),
});

const transforms = t.Record(t.String(), transformMappings);

export namespace VersionModel {
  export const createBody = t.Object({
    version: t.String({ maxLength: 50 }),
    transforms,
  });

  export type createBody = typeof createBody.static;

  export const updateBody = t.Object({
    transforms,
  });

  export type updateBody = typeof updateBody.static;

  export const webhookVersion = t.Object({
    id: t.String({ format: "uuid" }),
    version: t.String(),
    transforms,
    createdAt: t.String(),
    updatedAt: t.String(),
  });

  export type webhookVersion = WebhookVersion;

  export const versionList = t.Object({
    versions: t.Array(webhookVersion),
    total: t.Number(),
  });

  export type versionList = typeof versionList.static;
}
