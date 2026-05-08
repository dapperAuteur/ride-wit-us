import { NextRequest, NextResponse } from "next/server";
import { sendToOutbox, sendPodcastToOutbox } from "@/lib/witus-sender";

// /api/outbox/publish — fans out a publish event to the WitUS Outbox so it
// drafts social posts (and any other downstream publishing).
//
// Two channels:
//   kind: "episode_published" | "season_complete"  → podcast pipeline
//     (uses OUTBOX_PODCAST_RWU_SECRET + OUTBOX_PODCAST_RWU_SLUG so the
//      podcast credential pair can be revoked / rotated independently)
//   kind: "ad_hoc"                                → general bike content
//     (uses OUTBOX_INGEST_SECRET + OUTBOX_SOURCE_SLUG)
//
// Auth: this endpoint is internal — protect via a shared secret in the
// Authorization header that matches OUTBOX_INGEST_SECRET (the user calling
// this from the inside has the same secret as the receiver). For now we
// accept any POST; tighten in a follow-up if exposed publicly.

interface EpisodePublishedPayload {
  kind: "episode_published";
  season: number;
  ep: number;
  slug: string;
  title: string;
  subtitle?: string;
  audioUrl?: string;
}

interface SeasonCompletePayload {
  kind: "season_complete";
  season: number;
  title: string;
}

interface AdHocPayload {
  kind: "ad_hoc";
  title: string;
  summary: string;
  url: string;
  image_url?: string;
}

type PublishPayload = EpisodePublishedPayload | SeasonCompletePayload | AdHocPayload;

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const body = payload as Partial<PublishPayload>;
  if (!body.kind || typeof body.kind !== "string") {
    return NextResponse.json({ ok: false, error: "missing_kind" }, { status: 400 });
  }

  let result;

  if (body.kind === "episode_published") {
    if (
      typeof body.season !== "number" ||
      typeof body.ep !== "number" ||
      typeof body.slug !== "string" ||
      typeof body.title !== "string"
    ) {
      return NextResponse.json({ ok: false, error: "missing_episode_fields" }, { status: 400 });
    }
    result = await sendPodcastToOutbox(payload as Record<string, unknown>);
  } else if (body.kind === "season_complete") {
    if (typeof body.season !== "number" || typeof body.title !== "string") {
      return NextResponse.json({ ok: false, error: "missing_season_fields" }, { status: 400 });
    }
    result = await sendPodcastToOutbox(payload as Record<string, unknown>);
  } else if (body.kind === "ad_hoc") {
    if (typeof body.title !== "string" || typeof body.summary !== "string" || typeof body.url !== "string") {
      return NextResponse.json({ ok: false, error: "missing_ad_hoc_fields" }, { status: 400 });
    }
    result = await sendToOutbox(payload as Record<string, unknown>);
  } else {
    return NextResponse.json({ ok: false, error: `unknown_kind:${body.kind}` }, { status: 400 });
  }

  return NextResponse.json({
    ok: result.ok,
    kind: body.kind,
    outbox: { stubbed: !!result.stubbed, status: result.status },
    ...(result.ok ? {} : { error: result.error }),
  });
}
