import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { databaseConfigured } from "@/lib/db/config";
import { cronAuthorized } from "@/lib/outbox/cron-auth";
import { drainOutbox } from "@/lib/outbox/drain";
import { drizzleOutboxStore } from "@/lib/outbox/store";

// GET /api/cron/outbox-drain: sends every due outbox row to CentenarianOS (lib/outbox/drain.ts).
// Called by Vercel Cron (vercel.json) with `Authorization: Bearer <CRON_SECRET>`; trip writes also
// drain their own rows right after the response, so the cron is the safety net, not the only path.
// Answers counts per receiver, never payloads.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = cronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET);
  if (auth === "not_configured") return NextResponse.json({ ok: false, error: "Not configured", code: "not_configured" }, { status: 503 });
  if (auth === "unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  if (!databaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Not configured", code: "not_configured" }, { status: 503 });
  }
  try {
    const reports = await drainOutbox(drizzleOutboxStore(getDb()));
    return NextResponse.json({ ok: true, data: { receivers: reports } }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[outbox] cron drain failed err=%s", err instanceof Error ? err.name : "error");
    return NextResponse.json({ ok: false, error: "Lookup failed", code: "lookup_failed" }, { status: 500 });
  }
}
