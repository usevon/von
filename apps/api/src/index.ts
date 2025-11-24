import { env } from "@/env"
import { app, log } from "@/app"

app.listen(env.PORT)

log.info(`Von API running on port ${env.PORT}`)

export type { App } from "@/app"