import { env } from "@/env"
import { app } from "@/app"

app.listen(env.PORT)

console.log(`Von API running on port ${env.PORT}`)

export type { App } from "@/app"
