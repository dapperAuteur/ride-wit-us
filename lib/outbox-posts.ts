/**
 * Turns a RideWitUS publish event into WitUS Outbox drafts, one per platform, in the shape the
 * Outbox validates (lib/witus-contracts.ts). Pure apart from reading the curriculum.
 *
 * Follows the Outbox integration guide (claude/witus-outbox examples/INTEGRATE.md):
 *   - `external_ref` is stable per logical event and platform, so a re-fire is idempotent
 *     (the Outbox returns the existing row instead of inserting a duplicate).
 *   - Every draft is `as_draft: true` with a placeholder `scheduled_at` of now + 7 days; BAM picks
 *     the real time when promoting it in the Outbox.
 *   - Captions carry no personal data: they are built from the public curriculum only.
 */
import { z } from "zod";
import { episodeBySlug } from "./curriculum/episodes";
import { seasonOf } from "./curriculum/season-colors";
import { APP_NAME, SITE_URL } from "./site-meta";
import type { OutboxPlatform, OutboxSubmission } from "./sender-outbox";
import { OUTBOX_PLATFORMS } from "./witus-contracts";
import type { OutboxChannel } from "./witus-sender";

export const DEFAULT_PLATFORMS: readonly OutboxPlatform[] = ["linkedin", "twitter", "bluesky"];
const DRAFT_PLACEHOLDER_MS = 7 * 24 * 60 * 60 * 1000;

/** Platforms with a short post limit get the one-liner caption. */
const SHORT_LIMITS: Partial<Record<OutboxPlatform, number>> = { twitter: 280, bluesky: 300 };

const platforms = z.array(z.enum(OUTBOX_PLATFORMS)).min(1).max(OUTBOX_PLATFORMS.length).optional();
const httpsUrl = z.string().url().regex(/^https:\/\//, "must be an https URL");

export const publishRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("episode_published"),
    slug: z.string().min(1).max(200),
    image_url: httpsUrl.optional(),
    platforms,
  }),
  z.object({
    kind: z.literal("season_complete"),
    season: z.number().int(),
    image_url: httpsUrl.optional(),
    platforms,
  }),
  z.object({
    kind: z.literal("ad_hoc"),
    /** Caller's stable id for this announcement; reusing it re-fires idempotently. */
    ref: z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/, "lowercase letters, digits and dashes"),
    title: z.string().trim().min(1).max(200),
    summary: z.string().trim().min(1).max(2000),
    url: httpsUrl,
    image_url: httpsUrl.optional(),
    platforms,
  }),
]);

export type PublishRequest = z.infer<typeof publishRequestSchema>;

export type BuiltDrafts =
  | { ok: true; channel: OutboxChannel; submissions: OutboxSubmission[] }
  | { ok: false; error: "unknown_episode" | "unknown_season" };

interface Post {
  refBase: string;
  /** Long form, for LinkedIn and anything without a short limit. */
  long: string;
  /** One-liner pieces; the title is shortened if the whole line would not fit. */
  short: { prefix: string; title: string; suffix: string };
  link: string;
}

/** `prefix + title + suffix`, shortening only the title (with an ellipsis) to fit `max`. */
export function fitOneLiner(prefix: string, title: string, suffix: string, max: number): string {
  const full = `${prefix}${title}${suffix}`;
  if (full.length <= max) return full;
  const room = max - prefix.length - suffix.length - 1;
  if (room <= 0) return full.slice(0, max);
  return `${prefix}${title.slice(0, room).trimEnd()}…${suffix}`;
}

function describe(req: PublishRequest): { channel: OutboxChannel; post: Post } | { error: "unknown_episode" | "unknown_season" } {
  if (req.kind === "episode_published") {
    const ep = episodeBySlug(req.slug);
    if (!ep) return { error: "unknown_episode" };
    const code = `S${ep.season}·E${String(ep.ep).padStart(2, "0")}`;
    const link = `${SITE_URL}/episodes/${ep.slug}`;
    return {
      channel: "podcast",
      post: {
        refBase: `rwu-episode-${ep.slug}`,
        long: [`New ${APP_NAME} episode, ${code}: "${ep.title}"`, "", ep.subtitle ?? ep.body, "", `Listen: ${link}`].join("\n"),
        short: { prefix: `New ${APP_NAME} episode, ${code}: "`, title: ep.title, suffix: `" ${link}` },
        link,
      },
    };
  }
  if (req.kind === "season_complete") {
    let title: string;
    let tagline: string;
    try {
      const s = seasonOf(req.season);
      title = s.title;
      tagline = s.tagline;
    } catch {
      return { error: "unknown_season" };
    }
    const link = `${SITE_URL}/seasons/${req.season}`;
    return {
      channel: "podcast",
      post: {
        refBase: `rwu-season-${req.season}-complete`,
        long: [`${APP_NAME} Season ${req.season} is complete: ${title}`, "", tagline, "", `Every episode: ${link}`].join("\n"),
        short: { prefix: `${APP_NAME} Season ${req.season} is complete: `, title, suffix: `. ${link}` },
        link,
      },
    };
  }
  return {
    channel: "general",
    post: {
      refBase: `rwu-adhoc-${req.ref}`,
      long: [req.title, "", req.summary, "", req.url].join("\n"),
      short: { prefix: "", title: req.title, suffix: ` ${req.url}` },
      link: req.url,
    },
  };
}

export function buildOutboxDrafts(req: PublishRequest, now: Date = new Date()): BuiltDrafts {
  const d = describe(req);
  if ("error" in d) return { ok: false, error: d.error };
  const scheduledAt = new Date(now.getTime() + DRAFT_PLACEHOLDER_MS).toISOString();
  const targets = req.platforms ?? DEFAULT_PLATFORMS;
  const submissions = [...new Set(targets)].map((platform): OutboxSubmission => {
    const limit = SHORT_LIMITS[platform];
    const caption = limit ? fitOneLiner(d.post.short.prefix, d.post.short.title, d.post.short.suffix, limit) : d.post.long;
    return {
      external_ref: `${d.post.refBase}-${platform}`,
      platform,
      caption,
      media_urls: req.image_url ? [req.image_url] : [],
      links: [d.post.link],
      scheduled_at: scheduledAt,
      as_draft: true,
    };
  });
  return { ok: true, channel: d.channel, submissions };
}
