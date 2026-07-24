// Unit tests never open connections, the env schemas just require values at import.
process.env.DATABASE_URL ??= "postgres://von:von@localhost:55432/von_test";
process.env.REDIS_URL ??= "redis://localhost:16379";
process.env.BETTER_AUTH_SECRET ??= "test-secret-at-least-32-characters-long";
