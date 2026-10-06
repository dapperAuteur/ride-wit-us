import "server-only";

/**
 * Run a page's reads; on failure log the error class (never the message: Drizzle errors carry
 * query parameters) and return null so the page renders the database-error gate.
 */
export async function safeLoad<T>(what: string, fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false }> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    console.error("[mobility] %s failed err=%s", what, err instanceof Error ? err.name : "UnknownError");
    return { ok: false };
  }
}
