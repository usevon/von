import { treaty } from "@elysiajs/eden";
import { app } from "../src/app";

export { app } from "../src/app";
export { startEventBufferFlusher } from "../src/lib/event-buffer";

export type App = typeof app;

export const client = treaty(app);
