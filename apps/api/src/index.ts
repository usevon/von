import { app } from "@/app";
import { env } from "@/env";

app.listen(env.PORT);

console.log(`Von API running on port ${env.PORT}`);

export type { App } from "@/app";
