/**
 * Fixed-window rate limiting backed by the `rate_limit_buckets` table, for public write endpoints
 * (the waitlist today). In-memory counters do not work on serverless: each instance would count
 * alone. The key is an HMAC of the client IP, so no raw address is stored.
 */
import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import type { Db } from "@/db";

/**
 * The client IP as Vercel reports it: the first entry of x-forwarded-for, else x-real-ip.
 * "unknown" when neither is present (local dev), which then shares one bucket.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * `<scope>:<hmac>`. RATE_LIMIT_SALT is optional; without it the HMAC key is the scope itself, which
 * still hides the IP from a casual reader of the table but not from someone who brute-forces the
 * IPv4 space. Set the salt in production (plans/user-tasks/07).
 */
export function rateLimitKey(scope: string, ip: string, salt = process.env.RATE_LIMIT_SALT ?? ""): string {
  const digest = createHmac("sha256", salt || scope).update(`${scope}|${ip}`).digest("hex").slice(0, 32);
  return `${scope}:${digest}`;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
}

/** Count this hit and say whether it is within `limit` per `windowSeconds`. One atomic upsert. */
export async function consumeRateLimit(
  db: Db,
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number }
): Promise<RateLimitResult> {
  const rows = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limit_buckets (key, window_start, count)
    VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limit_buckets.window_start < now() - make_interval(secs => ${windowSeconds})
        THEN 1 ELSE rate_limit_buckets.count + 1 END,
      window_start = CASE
        WHEN rate_limit_buckets.window_start < now() - make_interval(secs => ${windowSeconds})
        THEN now() ELSE rate_limit_buckets.window_start END
    RETURNING count
  `);
  const count = Number(rows.rows[0]?.count ?? limit + 1);
  return { allowed: count <= limit, count };
}
