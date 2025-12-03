import { treaty } from "@elysiajs/eden"

if (!process.env.BETTER_AUTH_SECRET) {
  console.error("ERROR: Missing required environment variables.")
  console.error("Run tests from apps/tunnel/ directory: cd apps/tunnel && bun test")
  process.exit(1)
}

const { app } = await import("../src/app")

export type App = typeof app

export const client = treaty(app)
