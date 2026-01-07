import { toNextJsHandler } from "@usevon/auth";

import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
