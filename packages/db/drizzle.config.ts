import { defineConfig } from "drizzle-kit";

// Generated sql lands where the rust services embed it, so drizzle-kit authors
// migrations and von-migrate applies them.
export default defineConfig({
  schema: "./src/schema.ts",
  out: "../../services/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
