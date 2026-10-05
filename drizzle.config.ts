import type { Config } from "drizzle-kit";
import { config as loadEnv } from "dotenv";

// drizzle-kit runs outside Next, so it only sees what dotenv loads. `pnpm db:generate` needs no
// database at all (it diffs the schema against db/migrations). `pnpm db:migrate:prod` does, and BAM
// runs it with DATABASE_URL_UNPOOLED exported in his shell (ecosystem rule: never from a file).
loadEnv({ path: ".env.local", quiet: true });

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

export default {
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  ...(url ? { dbCredentials: { url } } : {}),
  strict: true,
  verbose: true,
} satisfies Config;
