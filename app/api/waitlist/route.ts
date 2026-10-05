import { NextResponse, after, type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { waitlistEntries } from "@/db/schema";
import { databaseConfigured } from "@/lib/db/config";
import { clientIp, consumeRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { buildWaitlistInboxSubmission, isHoneypotFilled, parseWaitlist } from "@/lib/waitlist/validate";
import { sendToInbox } from "@/lib/witus-sender";

// POST /api/waitlist — public signup for the mobility app (PRD §5.12).
//
// Flow: fail closed without a database (503) → honeypot (silent success, nothing stored) →
// validate → rate limit per IP (5 an hour) → upsert by email → after the response, notify BAM in
// WitUS Inbox once per address. The response is identical for a new and a repeat signup, so the
// endpoint does not reveal who is already on the list.
//
// Logs carry fixed tokens and error class names only: never the email, note, or IP.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 5, windowSeconds: 60 * 60 };
const JOINED = { ok: true, data: { status: "joined" } } as const;

function fail(status: number, error: string, code: string, field?: "email" | "note") {
  return NextResponse.json({ ok: false, error, code, ...(field ? { field } : {}) }, { status });
}

export async function POST(request: NextRequest) {
  if (!databaseConfigured()) {
    return fail(503, "The waitlist isn't open on this site yet. Try again later.", "db_not_configured");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Send the form as JSON.", "invalid_body");
  }

  if (isHoneypotFilled(body)) return NextResponse.json(JOINED);

  const parsed = parseWaitlist(body);
  if (!parsed.ok) return fail(400, parsed.error, "invalid_input", parsed.field);

  const db = getDb();
  try {
    const rl = await consumeRateLimit(db, rateLimitKey("waitlist", clientIp(request.headers)), RATE_LIMIT);
    if (!rl.allowed) {
      return fail(429, "Too many signups from this connection. Try again in an hour.", "rate_limited");
    }

    const [row] = await db
      .insert(waitlistEntries)
      .values({ email: parsed.data.email, note: parsed.data.note })
      .onConflictDoUpdate({
        target: waitlistEntries.email,
        set: {
          note: sql`coalesce(excluded.note, ${waitlistEntries.note})`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: waitlistEntries.id, notifiedAt: waitlistEntries.notifiedAt, createdAt: waitlistEntries.createdAt });

    if (row && !row.notifiedAt) {
      const submission = buildWaitlistInboxSubmission({ ...parsed.data, joinedAt: row.createdAt });
      after(async () => {
        const result = await sendToInbox(submission);
        // A stub (no Inbox env) is not a delivery: leave notified_at empty so a later signup on a
        // provisioned deploy still notifies.
        if (!result.ok || result.stubbed) {
          if (!result.ok) console.error("[waitlist] inbox notify failed status=%s", result.status ?? "none");
          return;
        }
        try {
          await getDb().update(waitlistEntries).set({ notifiedAt: sql`now()` }).where(eq(waitlistEntries.id, row.id));
        } catch (err) {
          console.error("[waitlist] mark notified failed err=%s", err instanceof Error ? err.name : "UnknownError");
        }
      });
    }
  } catch (err) {
    console.error("[waitlist] signup failed err=%s", err instanceof Error ? err.name : "UnknownError");
    return fail(500, "Something went wrong saving that. Try again in a minute.", "database_error");
  }

  return NextResponse.json(JOINED);
}
