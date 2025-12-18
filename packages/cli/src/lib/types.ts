export type DeviceCodeResponse = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval: number;
};

export type DeviceTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

export type UserSession = {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  session: {
    id: string;
    activeOrganizationId?: string;
  };
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
};

export type TunnelRegistration = {
  tunnelId: string;
  secret: string;
  tunnelUrl: string;
  wsUrl: string;
};
