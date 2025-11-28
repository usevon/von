import { env } from "@/env"
import { app } from "@/app"
import { setWebSocketServer } from "@/websocket/server"

const instance = app.listen(env.PORT)

if (instance.server) {
  setWebSocketServer(instance.server)
}

console.log(`Von API running on port ${env.PORT}`)

export type { App } from "@/app"