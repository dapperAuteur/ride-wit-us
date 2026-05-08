// lib/witus-sender.ts — signed HMAC sender for the WitUS Inbox + Outbox APIs.
//
// Both apps speak the same canonical webhook contract (vetted in
// claude/witus-inbox/examples/sender.ts):
//
//   POST <ingest-url>
//   X-Witus-Source: <source-slug>
//   X-Witus-Timestamp: <unix-sec>
//   X-Witus-Signature: sha256=<hex(HMAC-SHA256(secret, `${timestamp}.${rawBody}`))>
//   Content-Type: application/json
//   <rawBody>
//
// 5-minute replay window enforced on the receiver. Constant-time signature
// comparison on the receiver. Senders just sign and post.
//
// RideWitUS uses three credential triples in production:
//   INBOX_INGEST_URL     + INBOX_INGEST_SECRET     + INBOX_SOURCE_SLUG
//     → forms (class_notify_signup, host_listen_party, general_contact)
//   OUTBOX_INGEST_URL    + OUTBOX_INGEST_SECRET    + OUTBOX_SOURCE_SLUG
//     → general bike content posts (one-off announcements, ride recaps)
//   OUTBOX_INGEST_URL    + OUTBOX_PODCAST_RWU_SECRET + OUTBOX_PODCAST_RWU_SLUG
//     → podcast-specific publishing pipeline (episode-published,
//       season-complete) — separate credential pair so the podcast channel
//       can be revoked / rotated independently.
//
// All env vars are optional at build time; if a credential triple is missing
// we log to stdout and return { ok: true, stubbed: true } so dev flows keep
// moving without provisioning.

import { createHmac } from "node:crypto";

export interface WitusSendResult {
  ok: boolean;
  stubbed?: boolean;
  status?: number;
  error?: string;
}

interface SenderConfig {
  url: string;
  secret: string;
  sourceSlug: string;
}

function readConfig(prefix: "INBOX" | "OUTBOX_GENERAL" | "OUTBOX_PODCAST"): SenderConfig | null {
  const map = {
    INBOX: {
      url: process.env.INBOX_INGEST_URL,
      secret: process.env.INBOX_INGEST_SECRET,
      sourceSlug: process.env.INBOX_SOURCE_SLUG,
    },
    OUTBOX_GENERAL: {
      url: process.env.OUTBOX_INGEST_URL,
      secret: process.env.OUTBOX_INGEST_SECRET,
      sourceSlug: process.env.OUTBOX_SOURCE_SLUG,
    },
    OUTBOX_PODCAST: {
      url: process.env.OUTBOX_INGEST_URL,
      secret: process.env.OUTBOX_PODCAST_RWU_SECRET,
      sourceSlug: process.env.OUTBOX_PODCAST_RWU_SLUG,
    },
  };
  const cfg = map[prefix];
  if (!cfg.url || !cfg.secret || !cfg.sourceSlug) return null;
  return { url: cfg.url, secret: cfg.secret, sourceSlug: cfg.sourceSlug };
}

async function postSigned(cfg: SenderConfig, payload: unknown, label: string): Promise<WitusSendResult> {
  const rawBody = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", cfg.secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Witus-Source": cfg.sourceSlug,
        "X-Witus-Timestamp": timestamp,
        "X-Witus-Signature": `sha256=${signature}`,
      },
      body: rawBody,
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, status: res.status, error: text.slice(0, 500) };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    // eslint-disable-next-line no-console
    console.error(`[${label}] send failed`, message);
    return { ok: false, error: message };
  }
}

function stub(label: string, payload: unknown): WitusSendResult {
  // eslint-disable-next-line no-console
  console.log(`[${label} stub]`, JSON.stringify(payload));
  return { ok: true, stubbed: true };
}

export async function sendToInbox(payload: Record<string, unknown>): Promise<WitusSendResult> {
  const cfg = readConfig("INBOX");
  if (!cfg) return stub("inbox", payload);
  return postSigned(cfg, payload, "inbox");
}

export async function sendToOutbox(payload: Record<string, unknown>): Promise<WitusSendResult> {
  const cfg = readConfig("OUTBOX_GENERAL");
  if (!cfg) return stub("outbox.general", payload);
  return postSigned(cfg, payload, "outbox.general");
}

export async function sendPodcastToOutbox(payload: Record<string, unknown>): Promise<WitusSendResult> {
  const cfg = readConfig("OUTBOX_PODCAST");
  if (!cfg) return stub("outbox.podcast", payload);
  return postSigned(cfg, payload, "outbox.podcast");
}
