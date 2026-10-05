import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { DatabaseNotConfiguredError, databaseUrl } from "@/lib/db/config";
import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;

let cached: { url: string; db: Db } | null = null;

/**
 * The Drizzle client over Neon's HTTP driver. Lazily created on first use so a build or a public
 * page never touches the database. Throws DatabaseNotConfiguredError when DATABASE_URL is missing:
 * callers gate on databaseConfigured() and render a "not switched on" state instead of reaching here.
 */
export function getDb(): Db {
  const url = databaseUrl();
  if (!url) throw new DatabaseNotConfiguredError();
  if (cached?.url === url) return cached.db;
  const db = drizzle(neon(url), { schema });
  cached = { url, db };
  return db;
}
