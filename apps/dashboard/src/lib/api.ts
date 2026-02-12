import { treaty } from "@elysiajs/eden";
import type { App } from "@usevon/api";
import { env } from "@/env";

const API_URL = env.NEXT_PUBLIC_API_URL;

export const api = treaty<App>(API_URL);
