export type AuthHeaders = Record<string, string | undefined>;

export type ResolvedAuth = {
  organizationId: string;
  userId: string;
  scopes: string[];
};

export type SessionContext = {
  organizationId: string;
  userId: string;
};

export type VerifyApiKeyResult = {
  valid: boolean;
  key?:
    | ({
        id: string;
        organizationId?: string | null;
        userId?: string | null;
      } & Record<string, unknown>)
    | null;
};

export type SessionResult = {
  session?: {
    activeOrganizationId?: string | null;
  } | null;
  user?: {
    id?: string | null;
  } | null;
} | null;

export type AuthApi = {
  api: {
    verifyApiKey: (input: {
      body: { key: string };
    }) => Promise<VerifyApiKeyResult>;
    getSession: (input: { headers: HeadersInit }) => Promise<SessionResult>;
  };
};

export type RedisTracking = {
  set: (key: string, value: string) => Promise<unknown>;
  sadd: (key: string, value: string) => Promise<unknown>;
};
