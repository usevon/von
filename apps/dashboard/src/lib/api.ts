import { treaty } from "@elysiajs/eden";
import type { App } from "@usevon/api";

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080";

export const api = treaty<App>(API_URL);
