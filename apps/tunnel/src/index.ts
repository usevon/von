import { app } from "@/app"
import { env } from "@/env"
import { logger } from "@usevon/utils/logger"

app.listen(env.PORT, () => {
  logger.info(`Tunnel server running on http://localhost:${env.PORT}`)
})
