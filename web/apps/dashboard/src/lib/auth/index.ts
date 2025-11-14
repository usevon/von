import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, apiKey } from 'better-auth/plugins';
import { db } from '@/lib/db';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    database: {
      generateId: false,
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
    }),
    apiKey(),
  ],
  trustedOrigins: ['http://localhost:5174'],
});

export type Auth = typeof auth;
