import { treaty } from "@elysiajs/eden";
import { app } from "../src/app";
import { startEventBufferFlusher } from "../src/lib/event-buffer";

export { app } from "../src/app";

export type App = typeof app;

export const client = treaty(app);

startEventBufferFlusher();
