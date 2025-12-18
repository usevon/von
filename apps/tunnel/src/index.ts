import { logger } from "@usevon/utils/logger";
import { app } from "@/app";
import { env } from "@/env";

app.listen(env.PORT, () => {
  logger.info(`Tunnel server running on http://localhost:${env.PORT}`);
});
