/**
 * Is the mobility database configured on this deployment?
 *
 * Read per call, never at module scope: every public page in this app is statically prerendered
 * and must keep building on a deploy with no database env at all (PRD §14, "mobility routes fail
 * closed"). Pure apart from reading process.env, so tests can drive it.
 *
 * DATABASE_URL is the pooled Neon connection string the Vercel Neon integration provides at
 * runtime. DATABASE_URL_UNPOOLED is used only by `pnpm db:migrate:prod` (drizzle.config.ts).
 * If BAM's Neon integration was created with a custom prefix, the variable is renamed in Vercel to
 * these names (plans/user-tasks/07); this code reads nothing else.
 */
type EnvLike = Record<string, string | undefined>;

const POSTGRES_URL = /^postgres(ql)?:\/\/\S+$/;

export function databaseUrl(env: EnvLike = process.env): string | null {
  const raw = env.DATABASE_URL?.trim();
  return raw && POSTGRES_URL.test(raw) ? raw : null;
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
