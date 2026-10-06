/**
 * Is the mobility database configured on this deployment?
 *
 * Read per call, never at module scope: every public page in this app is statically prerendered
 * and must keep building on a deploy with no database env at all (PRD §14, "mobility routes fail
 * closed"). Pure apart from reading process.env, so tests can drive it.
 *
 * DATABASE_URL is the pooled Neon connection string the Vercel Neon integration provides at
 * runtime. DATABASE_URL_UNPOOLED is used only by `pnpm db:migrate:prod` (drizzle.config.ts).
 * The Vercel Neon integration on this project was created with the `STORAGE_` prefix, so the same
 * values also arrive as STORAGE_DATABASE_URL / STORAGE_DATABASE_URL_UNPOOLED. Both spellings are
 * read; the unprefixed name wins when both are set.
 */
type EnvLike = Record<string, string | undefined>;

const POSTGRES_URL = /^postgres(ql)?:\/\/\S+$/;

/** Env names for the pooled runtime URL, in order of preference. */
export const DATABASE_URL_NAMES = ["DATABASE_URL", "STORAGE_DATABASE_URL"] as const;

/** Env names for the direct (unpooled) URL used by migrations, in order of preference. */
export const DATABASE_URL_UNPOOLED_NAMES = [
  "DATABASE_URL_UNPOOLED",
  "STORAGE_DATABASE_URL_UNPOOLED",
] as const;

function firstPostgresUrl(env: EnvLike, names: readonly string[]): string | null {
  for (const name of names) {
    const raw = env[name]?.trim();
    if (raw && POSTGRES_URL.test(raw)) return raw;
  }
  return null;
}

export function databaseUrl(env: EnvLike = process.env): string | null {
  return firstPostgresUrl(env, DATABASE_URL_NAMES);
}

/** The direct URL for migrations: an unpooled name first, then the pooled runtime URL. */
export function migrationDatabaseUrl(env: EnvLike = process.env): string | null {
  return firstPostgresUrl(env, DATABASE_URL_UNPOOLED_NAMES) ?? databaseUrl(env);
}

export function databaseConfigured(env: EnvLike = process.env): boolean {
  return databaseUrl(env) !== null;
}

/** Thrown by getDb() when there is no database. Callers check databaseConfigured() first. */
export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("database_not_configured");
    this.name = "DatabaseNotConfiguredError";
  }
}
