import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/auth/admin";
import { buildOutboxDrafts, publishRequestSchema } from "@/lib/outbox-posts";
import { hasPublishToken } from "@/lib/outbox-publish-token";
import { sendToOutbox } from "@/lib/witus-sender";

// POST /api/outbox/publish — turns a publish event into WitUS Outbox drafts (one per platform),
// following claude/witus-outbox examples/INTEGRATE.md.
//
// Body (lib/outbox-posts.ts `publishRequestSchema`):
//   { kind: "episode_published", slug, image_url?, platforms? }          → podcast channel
//   { kind: "season_complete", season, image_url?, platforms? }          → podcast channel
//   { kind: "ad_hoc", ref, title, summary, url, image_url?, platforms? } → general channel
// Episode and season text comes from the curriculum (lib/curriculum), not from the caller.
//
// Gates, in order:
//   1. Auth. The admin's signed-in session (ADMIN_EMAIL), or `Authorization: Bearer
//      <OUTBOX_PUBLISH_TOKEN>` for scripts. Unset token = session only. Fails closed.
//   2. Kill-switch. OUTBOX_TRIGGER_ENABLED must be exactly "true"; anything else answers 503 and
//      sends nothing, so BAM can mute every RideWitUS post with one env edit.
// Admin-only is the guide's "BAM-only smoke gate": no other user can trigger a post.
//
// Unlike a user-facing trigger, this request IS the operator's publish action, so it awaits the
// Outbox and reports each draft's result rather than firing after the response. Every draft is
// `as_draft: true`; nothing goes live until BAM promotes it in the Outbox.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authorization = req.headers.get("authorization");
  if (authorization) {
    if (!hasPublishToken(authorization)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  } else {
    const auth = await requireApiAdmin();
    if (auth instanceof NextResponse) return auth;
  }

  if (process.env.OUTBOX_TRIGGER_ENABLED !== "true") {
    return NextResponse.json({ ok: false, error: "outbox_triggers_disabled" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = publishRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: "invalid_request", field: issue?.path.join(".") || null },
      { status: 400 }
    );
  }

  const built = buildOutboxDrafts(parsed.data);
  if (!built.ok) {
    return NextResponse.json({ ok: false, error: built.error }, { status: 404 });
  }

  const results = [];
  for (const submission of built.submissions) {
    const r = await sendToOutbox(submission, built.channel);
    results.push({
      platform: submission.platform,
      external_ref: submission.external_ref,
      ok: r.ok,
      stubbed: !!r.stubbed,
      status: r.status ?? null,
      id: r.id ?? null,
      record_status: r.recordStatus ?? null,
      ...(r.ok ? {} : { error: r.error ?? "failed" }),
    });
  }

  const ok = results.every((r) => r.ok);
  return NextResponse.json(
    { ok, kind: parsed.data.kind, channel: built.channel, drafts: results },
    { status: ok ? 200 : 502 }
  );
}
