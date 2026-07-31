import { NextResponse } from "next/server";
import { EPISODES } from "@/lib/curriculum/episodes";

// /api/health: public, unauthenticated liveness probe for uptime monitors.
//
// WHAT THIS PROVES
//   The deployment booted, a route handler executes, and the curriculum source
//   of truth (lib/curriculum/episodes.ts) loaded with at least one episode.
//   That is a real check for this app: RideWitUS has no database and no auth,
//   so its only hard runtime dependency is its own bundled content module.
//
// WHAT THIS DOES NOT PROVE
//   Nothing about delivery. A form submission travels through Mailgun and the
//   WitUS Inbox / Outbox, and this endpoint deliberately calls NEITHER. A green
//   check here does not mean a /tune-in submission reached BAM. We report only
//   whether each credential set is PRESENT in the environment (a boolean), which
//   catches the common failure of a missing env var after a redeploy but says
//   nothing about whether the remote service is up.
//
//   Calling out to Mailgun or the Inbox from here would be worse than useless:
//   a third-party outage would turn this site's uptime monitor red while the
//   site itself served every page perfectly, and paging on someone else's
//   incident trains the monitor to be ignored.
//
// SAFETY
//   No env VALUE is ever read into the response, only `!!` of it. No error text
//   is ever echoed: the catch takes no binding, logs a constant string, and
//   returns a fixed token. No submission data exists in this handler's scope.

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
} as const;

/** True only when every named env var is set to a non-empty value. Never returns the value. */
function isConfigured(...names: string[]): boolean {
  return names.every((name) => {
    const value = process.env[name];
    return typeof value === "string" && value.length > 0;
  });
}

export async function GET() {
  try {
    // The one genuine in-process dependency check: the bundled curriculum
    // loaded. An empty catalog means the build shipped broken content even
    // though pages would still return 200.
    if (!Array.isArray(EPISODES) || EPISODES.length === 0) {
      // eslint-disable-next-line no-console
      console.error("[health] curriculum source empty");
      return NextResponse.json(
        { ok: false, error: "curriculum_unavailable" },
        { status: 503, headers: NO_STORE }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        service: "ride-wit-us",
        // Booleans only. Presence of configuration, never its value, and never
        // a live call to the service it configures.
        config: {
          mailgun: isConfigured("MAILGUN_API_KEY"),
          inbox: isConfigured("INBOX_INGEST_URL", "INBOX_INGEST_SECRET", "INBOX_SOURCE_SLUG"),
          outbox: isConfigured("OUTBOX_INGEST_URL", "OUTBOX_INGEST_SECRET", "OUTBOX_SOURCE_SLUG"),
        },
        time: new Date().toISOString(),
      },
      { status: 200, headers: NO_STORE }
    );
  } catch {
    // No binding, no err.message, no stack. A fixed token so the response text
    // can never carry an env value or a submitter's data.
    // eslint-disable-next-line no-console
    console.error("[health] check failed");
    return NextResponse.json(
      { ok: false, error: "health_check_failed" },
      { status: 503, headers: NO_STORE }
    );
  }
}

export async function HEAD() {
  try {
    const healthy = Array.isArray(EPISODES) && EPISODES.length > 0;
    return new Response(null, { status: healthy ? 200 : 503, headers: NO_STORE });
  } catch {
    // eslint-disable-next-line no-console
    console.error("[health] head check failed");
    return new Response(null, { status: 503, headers: NO_STORE });
  }
}
