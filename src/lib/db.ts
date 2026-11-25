import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import * as schema from "./schema";

export type AppDatabase = ReturnType<typeof drizzle<typeof schema>>;

/** D1 binding from the Worker env. Local `vite dev` uses Wrangler's local D1. */
export function getDb(): AppDatabase {
  return drizzle(env.DB, { schema });
}

/** The raw D1 binding, for the few writes that use plain SQL (lib/funnel). */
export function getD1() {
  return env.DB;
}
