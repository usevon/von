import { logger } from "@usevon/utils/logger";
import { app } from "@/app";
import { env } from "@/env";
import "@/lib/api-key-flush";
import { startEventBufferFlusher } from "@/lib/event-buffer";

startEventBufferFlusher();

export type { App } from "@/app";

app.listen(env.PORT, () => {
  logger.info(`API server running on http://localhost:${env.PORT}`);
});
