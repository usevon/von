"use client";

import { treaty } from "@elysiajs/eden";
import type { App } from "@usevon/api";
import { env } from "@/env";

export const api = treaty<App>(env.NEXT_PUBLIC_API_URL);
