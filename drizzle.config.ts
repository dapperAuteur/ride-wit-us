import type { Config } from "drizzle-kit";
import { config as loadEnv } from "dotenv";
import { migrationDatabaseUrl } from "./lib/db/config";

// drizzle-kit runs outside Next, so it only sees what dotenv loads. `pnpm db:generate` needs no
// database at all (it diffs the schema against db/migrations). `pnpm db:migrate:prod` does, and BAM
// runs it with DATABASE_URL_UNPOOLED exported in his shell (ecosystem rule: never from a file).
loadEnv({ path: ".env.local", quiet: true });

// DATABASE_URL_UNPOOLED or the Neon integration's STORAGE_DATABASE_URL_UNPOOLED, then the pooled URL.
const url = migrationDatabaseUrl() ?? undefined;

export default {
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  ...(url ? { dbCredentials: { url } } : {}),
  strict: true,
  verbose: true,
} satisfies Config;
