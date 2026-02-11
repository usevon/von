export type ApiKeyOptions = {
  signingSecret?: string;
  storage?: "database" | "secondary-storage";
  fallbackToDatabase?: boolean;
  secondaryStorage?: {
    get: (key: string) => Promise<string | null> | string | null;
    set: (key: string, value: string, ttl?: number) => Promise<void> | void;
    delete: (key: string) => Promise<void> | void;
  };
};

export type ApiKey = {
  id: string;
  name: string;
  start: string;
  key: string;
  userId: string;
  organizationId: string | null;
  environment: string;
  scopes: string[] | null;
  enabled: boolean;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ResolvedApiKeyOptions = {
  signingSecret?: string;
  storage: "database" | "secondary-storage";
  fallbackToDatabase: boolean;
  secondaryStorage?: ApiKeyOptions["secondaryStorage"];
};
