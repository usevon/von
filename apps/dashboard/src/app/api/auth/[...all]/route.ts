import { toNextJsHandler } from "@usevon/auth";

import { auth } from "@/lib/auth/server";

export const { GET, POST } = toNextJsHandler(auth.handler);
