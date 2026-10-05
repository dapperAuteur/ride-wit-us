/**
 * Local copies of the request-body rules the WitUS Inbox and Outbox enforce on `/api/ingest`.
 *
 * Neither receiver publishes its schema as a package, so these are copied rule for rule. Keep them
 * in step with the receivers when either one changes:
 *
 *   Inbox:  claude/witus-inbox  app/api/ingest/route.ts  `IngestPayload`
 *   Outbox: claude/witus-outbox app/api/ingest/route.ts  `IngestPayload`, lib/platforms.ts `PLATFORMS`
 *
 * They are used twice: by `lib/witus-sender.ts` as a pre-flight check (so a malformed body is caught
 * here and logged, instead of becoming a silent 400 at the receiver), and by the tests, which build
 * the exact bodies this app sends and validate them against these rules.
 *
 * Both receivers run zod 4, the same major version as this repo, so the validators are equivalent.
 * `z.string().email()` is kept as the receivers write it, not swapped for `z.email()`.
 */
import { z } from "zod";

/** WitUS Inbox: rejects with 400 unless the body matches this. Unknown top-level keys are dropped. */
export const inboxIngestSchema = z.object({
  form_type: z.string().min(1).max(120),
  submitter_email: z.string().email().max(255).optional(),
  submitter_name: z.string().min(1).max(255).optional(),
  priority: z.enum(["normal", "high"]).default("normal"),
  payload: z.record(z.string(), z.unknown()),
});

/** Outbox platform keys (witus-outbox lib/platforms.ts). */
export const OUTBOX_PLATFORMS = [
  "twitter",
  "instagram",
  "facebook",
  "linkedin",
  "youtube",
  "bluesky",
  "tiktok",
  "pinterest",
] as const;

const SCHEDULED_AT_MIN_LEAD_SECONDS = 5 * 60;

/** WitUS Outbox: rejects with 400 unless the body matches this. */
export const outboxIngestSchema = z
  .object({
    external_ref: z.string().min(1).max(255),
    platform: z.enum(OUTBOX_PLATFORMS),
    caption: z.string().min(1).max(10_000),
    media_urls: z
      .array(z.string().url().regex(/^https:\/\//, "media URLs must be https"))
      .max(20)
      .default([]),
    links: z.array(z.string().url()).max(20).optional(),
    scheduled_at: z.string().datetime({ offset: true }),
    social_profile_ids: z.array(z.string().min(1)).max(20).optional(),
    as_draft: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.as_draft) return true;
      const t = Date.parse(data.scheduled_at);
      if (Number.isNaN(t)) return false;
      return t >= Date.now() + SCHEDULED_AT_MIN_LEAD_SECONDS * 1000;
    },
    {
      message: "scheduled_at must be at least 5 minutes in the future (or set as_draft: true)",
      path: ["scheduled_at"],
    }
  );
