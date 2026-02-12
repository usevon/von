export type AuthHeaders = Record<string, string | undefined>;

export type ResolvedAuth = {
  organizationId: string;
  userId: string;
  scopes: string[];
};
