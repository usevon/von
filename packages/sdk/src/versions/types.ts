export type TransformMappings = {
  rename?: Record<string, string>;
  remove?: string[];
  defaults?: Record<string, unknown>;
};

export type Transforms = Record<string, TransformMappings>;

export type CreateVersionParams = {
  version: string;
  transforms: Transforms;
};

export type UpdateVersionParams = {
  transforms: Transforms;
};

export type WebhookVersion = {
  id: string;
  version: string;
  transforms: Transforms;
  createdAt: string;
  updatedAt: string;
};

export type VersionsResponse = {
  versions: WebhookVersion[];
  total: number;
};
