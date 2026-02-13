import { treaty } from "@elysiajs/eden";

if (!process.env.BETTER_AUTH_SECRET) {
  console.error("ERROR: Missing required environment variables.");
  console.error("Run tests from apps/api/ directory: cd apps/api && bun test");
  process.exit(1);
}

if (!process.env.API_KEY_SIGNING_SECRET) {
  process.env.API_KEY_SIGNING_SECRET = "integration-test-signing-secret";
}

export const { app } = await import("../src/app");

export type App = typeof app;

export const client = treaty(app);
