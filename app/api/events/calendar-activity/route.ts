import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { calendarActivities } from "@/db/schema";
import { databaseConfigured } from "@/lib/db/config";
import { receiveEvents } from "@/lib/events/inbound";
import { drizzleWriter, calendarActivitySpec } from "@/lib/events/projections";

// POST /api/events/calendar-activity: CentenarianOS's E6 calendar.activity events (contract in centenarian-os
// docs/integrations/ridewitus-contract.md). Signed by source `centenarianos` with this receiver's
// own secret (lib/signed/receiver.ts RECEIVERS); everything else is lib/events/inbound.ts.
// No secret = 503 not_configured; no database = 503 not_configured; a database error = 500.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const store = databaseConfigured() ? drizzleWriter(getDb(), calendarActivities) : null;
  const { status, body } = await receiveEvents(request, calendarActivitySpec, { store });
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
