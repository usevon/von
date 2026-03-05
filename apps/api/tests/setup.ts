import { treaty } from "@elysiajs/eden";
import { app } from "../src/app";

export { app };

export type App = typeof app;

export const client = treaty(app);
