import { NextRequest, NextResponse } from "next/server";

// Stub for the Inbox ingest pipe. Phase 4 will wire this to the canonical
// signed-HMAC sender at /Users/bam/Code_NOiCloud/ai-builds/claude/witus-inbox/examples/sender.ts.
// For now, accept any POST that includes a `form_type`, log the payload to
// stdout (so /tune-in can be tested locally), and return 200.
//
// Form-type taxonomy used by RideWitUS:
//   - class_notify_signup — { email, name?, selected_all, selected_seasons, selected_episodes }
//   - host_listen_party    — { org_name, contact, neighborhood, preferred_date?, notes }
//   - general_contact      — { name, email, message }

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const body = payload as { form_type?: string };
  if (!body.form_type) {
    return NextResponse.json({ ok: false, error: "missing_form_type" }, { status: 400 });
  }

  // eslint-disable-next-line no-console
  console.log("[inbox-ingest stub]", JSON.stringify(payload));

  return NextResponse.json({ ok: true, stubbed: true, received: payload });
}
