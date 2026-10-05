// lib/witus-sender.ts — this app's wrapper around the canonical WitUS Inbox and Outbox senders.
//
// The signing itself is NOT done here. It lives in two files copied byte for byte from the
// receivers, as their integration guides require ("do not modify the file"):
//
//   lib/sender-inbox.ts   ← claude/witus-inbox  examples/sender.ts
//   lib/sender-outbox.ts  ← claude/witus-outbox examples/sender.ts
//
// Both speak the same signed-webhook contract:
//
//   POST <ingest-url>
//   X-Witus-Source: <source-slug>
//   X-Witus-Timestamp: <unix-sec>
//   X-Witus-Signature: sha256=<hex(HMAC-SHA256(secret, `${timestamp}.${rawBody}`))>
//   Content-Type: application/json
//
// What this wrapper adds:
//   1. Reads the credential triple from env. A missing triple stubs the call (logs that a send was
//      skipped, never the body) and returns { ok: true, stubbed: true }, so local dev and
//      unprovisioned deploys keep working.
//   2. Pre-flight validates the body against a copy of the receiver's schema
//      (lib/witus-contracts.ts). A body the receiver would 400 is refused here instead.
//   3. Catches network errors (the canonical senders let fetch throw).
//   4. Logs metadata only: channel, form_type / platform + external_ref, HTTP status.
//
// Credential triples:
//   INBOX_INGEST_URL  + INBOX_INGEST_SECRET       + INBOX_SOURCE_SLUG        → Inbox (forms, waitlist)
//   OUTBOX_INGEST_URL + OUTBOX_INGEST_SECRET      + OUTBOX_SOURCE_SLUG       → Outbox, general posts
//   OUTBOX_INGEST_URL + OUTBOX_PODCAST_RWU_SECRET + OUTBOX_PODCAST_RWU_SLUG  → Outbox, podcast posts
//     (separate pair so the podcast channel can be revoked or rotated on its own)

import { sendToInbox as canonicalSendToInbox, type InboxSubmission } from "./sender-inbox";
import {
  sendToOutbox as canonicalSendToOutbox,
  type OutboxSubmission,
  type OutboxPlatform,
} from "./sender-outbox";
import { inboxIngestSchema, outboxIngestSchema } from "./witus-contracts";

export type { InboxSubmission, OutboxSubmission, OutboxPlatform };

export interface WitusSendResult {
  ok: boolean;
  stubbed?: boolean;
  status?: number;
  /** Receiver-assigned row id on success. */
  id?: string;
  /** Outbox only: the row's status. "draft" / "queued" = new row; anything else = idempotent match. */
  recordStatus?: string;
  /** Short machine-readable reason on failure. Never contains the body. */
  error?: string;
}

export type OutboxChannel = "general" | "podcast";

interface SenderConfig {
  url: string;
  secret: string;
  sourceSlug: string;
}

function readConfig(target: "inbox" | OutboxChannel): SenderConfig | null {
  const env = process.env;
  const raw =
    target === "inbox"
      ? { url: env.INBOX_INGEST_URL, secret: env.INBOX_INGEST_SECRET, sourceSlug: env.INBOX_SOURCE_SLUG }
      : target === "general"
        ? { url: env.OUTBOX_INGEST_URL, secret: env.OUTBOX_INGEST_SECRET, sourceSlug: env.OUTBOX_SOURCE_SLUG }
        : { url: env.OUTBOX_INGEST_URL, secret: env.OUTBOX_PODCAST_RWU_SECRET, sourceSlug: env.OUTBOX_PODCAST_RWU_SLUG };
  if (!raw.url || !raw.secret || !raw.sourceSlug) return null;
  return { url: raw.url, secret: raw.secret, sourceSlug: raw.sourceSlug };
}

/** Send one submission to the WitUS Inbox. Never throws. */
export async function sendToInbox(submission: InboxSubmission): Promise<WitusSendResult> {
  if (!inboxIngestSchema.safeParse(submission).success) {
    console.error("[inbox] refused: body fails the Inbox schema form_type=%s", submission.form_type);
    return { ok: false, error: "invalid_submission" };
  }
  const cfg = readConfig("inbox");
  if (!cfg) {
    console.log("[inbox stub] no Inbox env; skipped form_type=%s", submission.form_type);
    return { ok: true, stubbed: true };
  }
  try {
    const r = await canonicalSendToInbox({
      inboxUrl: cfg.url,
      sourceSlug: cfg.sourceSlug,
      hmacSecret: cfg.secret,
      submission,
    });
    if (!r.ok) {
      console.error("[inbox] rejected source=%s form_type=%s status=%d", cfg.sourceSlug, submission.form_type, r.status);
      return { ok: false, status: r.status, error: "rejected" };
    }
    return { ok: true, status: r.status, id: r.id };
  } catch (err) {
    console.error("[inbox] send failed err=%s", err instanceof Error ? err.name : "UnknownError");
    return { ok: false, error: "network_error" };
  }
}

/** Send one draft to the WitUS Outbox on the given credential channel. Never throws. */
export async function sendToOutbox(submission: OutboxSubmission, channel: OutboxChannel): Promise<WitusSendResult> {
  const label = `outbox.${channel}`;
  if (!outboxIngestSchema.safeParse(submission).success) {
    console.error("[%s] refused: body fails the Outbox schema external_ref=%s", label, submission.external_ref);
    return { ok: false, error: "invalid_submission" };
  }
  const cfg = readConfig(channel);
  if (!cfg) {
    console.log("[%s stub] no Outbox env; skipped platform=%s external_ref=%s", label, submission.platform, submission.external_ref);
    return { ok: true, stubbed: true };
  }
  try {
    const r = await canonicalSendToOutbox({
      outboxUrl: cfg.url,
      sourceSlug: cfg.sourceSlug,
      hmacSecret: cfg.secret,
      submission,
    });
    if (!r.ok) {
      console.error(
        "[%s] rejected source=%s platform=%s external_ref=%s status=%d",
        label,
        cfg.sourceSlug,
        submission.platform,
        submission.external_ref,
        r.status
      );
      return { ok: false, status: r.status, error: "rejected" };
    }
    return { ok: true, status: r.status, id: r.id, recordStatus: r.recordStatus };
  } catch (err) {
    console.error("[%s] send failed err=%s", label, err instanceof Error ? err.name : "UnknownError");
    return { ok: false, error: "network_error" };
  }
}
