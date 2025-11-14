import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://von:von@localhost:5432/von';

const client = postgres(connectionString);
export const db = drizzle(client);
