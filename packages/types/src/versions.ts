export type TransformMappings = {
  rename?: Record<string, string>;
  remove?: string[];
  defaults?: Record<string, unknown>;
};

export type WebhookVersion = {
  id: string;
  version: string;
  transforms: Record<string, TransformMappings>;
  createdAt: string;
  updatedAt: string;
};
