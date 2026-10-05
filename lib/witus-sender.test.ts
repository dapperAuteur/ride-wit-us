import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildFormInboxSubmission } from "./inbox-forms";
import { buildOutboxDrafts } from "./outbox-posts";
import { buildWaitlistInboxSubmission } from "./waitlist/validate";
import { inboxIngestSchema, outboxIngestSchema } from "./witus-contracts";
import { sendToInbox, sendToOutbox } from "./witus-sender";

// No real network: fetch is stubbed per test and every URL is a .invalid host.

const SECRET = "0".repeat(64);
const ENV_KEYS = [
  "INBOX_INGEST_URL",
  "INBOX_INGEST_SECRET",
  "INBOX_SOURCE_SLUG",
  "OUTBOX_INGEST_URL",
  "OUTBOX_INGEST_SECRET",
  "OUTBOX_SOURCE_SLUG",
  "OUTBOX_PODCAST_RWU_SECRET",
  "OUTBOX_PODCAST_RWU_SLUG",
] as const;
const saved: Record<string, string | undefined> = {};

interface Captured {
  url: string;
  headers: Record<string, string>;
  body: string;
}

function stubFetch(response: { status: number; body: unknown }) {
  const calls: Captured[] = [];
  const fn = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, headers: init.headers as Record<string, string>, body: init.body as string });
    return new Response(JSON.stringify(response.body), { status: response.status });
  });
  vi.stubGlobal("fetch", fn);
  return { fn, calls };
}

/** What the receivers do: recompute HMAC-SHA256 over `${timestamp}.${rawBody}`. */
function expectValidSignature(c: Captured, secret: string) {
  const ts = c.headers["X-Witus-Timestamp"];
  expect(ts).toMatch(/^\d+$/);
  expect(Math.abs(Math.floor(Date.now() / 1000) - Number(ts))).toBeLessThanOrEqual(300);
  const expected = createHmac("sha256", secret).update(`${ts}.${c.body}`).digest("hex");
  expect(c.headers["X-Witus-Signature"]).toBe(`sha256=${expected}`);
  expect(c.headers["Content-Type"]).toBe("application/json");
}

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  for (const k of ENV_KEYS) delete process.env[k];
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Inbox submissions match the Inbox's /api/ingest schema", () => {
  it("class_notify_signup puts the fields in payload and keeps a valid submitter_email", () => {
    const s = buildFormInboxSubmission({
      form_type: "class_notify_signup",
      email: "rider@example.com",
      name: "Rider",
      selected_all: false,
      selected_seasons: [1],
      selected_episodes: ["brakes"],
    });
    expect(inboxIngestSchema.safeParse(s).success).toBe(true);
    expect(s).toEqual({
      form_type: "class_notify_signup",
      submitter_email: "rider@example.com",
      submitter_name: "Rider",
      priority: "normal",
      payload: {
        app: "RideWitUS",
        email: "rider@example.com",
        name: "Rider",
        selected_all: false,
        selected_seasons: [1],
        selected_episodes: ["brakes"],
      },
    });
  });

  it("host_listen_party pulls an email out of the contact field, or leaves submitter_email off", () => {
    const withEmail = buildFormInboxSubmission({
      form_type: "host_listen_party",
      org_name: "Shop",
      contact: "Sam, sam@shop.example, 555-0100",
      neighborhood: "Downtown",
    });
    expect(inboxIngestSchema.safeParse(withEmail).success).toBe(true);
    expect(withEmail.submitter_email).toBe("sam@shop.example");

    const phoneOnly = buildFormInboxSubmission({
      form_type: "host_listen_party",
      org_name: "Shop",
      contact: "555-0100",
      neighborhood: "Downtown",
    });
    expect(inboxIngestSchema.safeParse(phoneOnly).success).toBe(true);
    expect(phoneOnly).not.toHaveProperty("submitter_email");
  });

  it("drops a submitter_email the Inbox would reject instead of failing the whole submission", () => {
    const s = buildFormInboxSubmission({ form_type: "general_contact", name: "A", email: "not-an-email", message: "hi" });
    expect(s).not.toHaveProperty("submitter_email");
    expect(inboxIngestSchema.safeParse(s).success).toBe(true);
    expect(s.payload).toMatchObject({ email: "not-an-email", message: "hi" });
  });

  it("the waitlist notice matches", () => {
    const s = buildWaitlistInboxSubmission({ email: "a@b.co", note: "commuter", joinedAt: new Date() });
    expect(inboxIngestSchema.safeParse(s).success).toBe(true);
  });

  it("the old forward shape (fields spread at the top level, no payload) is what the Inbox rejected", () => {
    const old = { form_type: "general_contact", name: "A", email: "a@b.co", message: "hi", _source_app: "ridewitus" };
    expect(inboxIngestSchema.safeParse(old).success).toBe(false);
  });
});

describe("sendToInbox", () => {
  const submission = buildFormInboxSubmission({ form_type: "general_contact", name: "A", email: "a@b.co", message: "hi" });

  it("stubs without calling the network when the Inbox env is missing", async () => {
    const { fn } = stubFetch({ status: 200, body: { ok: true, id: "x" } });
    expect(await sendToInbox(submission)).toEqual({ ok: true, stubbed: true });
    expect(fn).not.toHaveBeenCalled();
  });

  it("signs the exact bytes it sends, with the X-Witus-* headers", async () => {
    process.env.INBOX_INGEST_URL = "https://inbox.invalid/api/ingest";
    process.env.INBOX_INGEST_SECRET = SECRET;
    process.env.INBOX_SOURCE_SLUG = "ride-witus";
    const { calls } = stubFetch({ status: 200, body: { ok: true, id: "row-1" } });

    expect(await sendToInbox(submission)).toEqual({ ok: true, status: 200, id: "row-1" });
    expect(calls).toHaveLength(1);
    const c = calls[0];
    expect(c.url).toBe("https://inbox.invalid/api/ingest");
    expect(c.headers["X-Witus-Source"]).toBe("ride-witus");
    expectValidSignature(c, SECRET);
    expect(c.body).toBe(JSON.stringify(submission));
    expect(inboxIngestSchema.safeParse(JSON.parse(c.body)).success).toBe(true);
  });

  it("refuses a body the Inbox would reject, without calling the network", async () => {
    process.env.INBOX_INGEST_URL = "https://inbox.invalid/api/ingest";
    process.env.INBOX_INGEST_SECRET = SECRET;
    process.env.INBOX_SOURCE_SLUG = "ride-witus";
    const { fn } = stubFetch({ status: 200, body: { ok: true, id: "x" } });
    const bad = { form_type: "x" } as unknown as Parameters<typeof sendToInbox>[0];
    expect(await sendToInbox(bad)).toEqual({ ok: false, error: "invalid_submission" });
    expect(fn).not.toHaveBeenCalled();
  });

  it("reports a rejection and a network error without throwing or logging the body", async () => {
    process.env.INBOX_INGEST_URL = "https://inbox.invalid/api/ingest";
    process.env.INBOX_INGEST_SECRET = SECRET;
    process.env.INBOX_SOURCE_SLUG = "ride-witus";
    stubFetch({ status: 400, body: { ok: false } });
    expect(await sendToInbox(submission)).toEqual({ ok: false, status: 400, error: "rejected" });

    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    expect(await sendToInbox(submission)).toEqual({ ok: false, error: "network_error" });

    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).not.toContain("a@b.co");
    expect(logged).not.toContain(SECRET);
  });
});

describe("Outbox drafts match the Outbox's /api/ingest schema", () => {
  const now = new Date("2026-10-05T12:00:00Z");

  it("episode_published: one draft per default platform, stable refs, podcast channel", () => {
    const built = buildOutboxDrafts({ kind: "episode_published", slug: "brakes" }, now);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.channel).toBe("podcast");
    expect(built.submissions.map((s) => s.external_ref)).toEqual([
      "rwu-episode-brakes-linkedin",
      "rwu-episode-brakes-twitter",
      "rwu-episode-brakes-bluesky",
    ]);
    for (const s of built.submissions) {
      expect(outboxIngestSchema.safeParse(s).success).toBe(true);
      expect(s.as_draft).toBe(true);
      expect(s.scheduled_at).toBe("2026-10-12T12:00:00.000Z");
      expect(s.media_urls).toEqual([]);
      expect(s.links).toEqual(["https://ridewitus.witus.online/episodes/brakes"]);
    }
    const twitter = built.submissions.find((s) => s.platform === "twitter")!;
    expect(twitter.caption.length).toBeLessThanOrEqual(280);
    expect(twitter.caption).toContain('"Brakes"');
  });

  it("re-firing the same event yields the same external_refs (idempotent at the Outbox)", () => {
    const a = buildOutboxDrafts({ kind: "season_complete", season: 2 }, now);
    const b = buildOutboxDrafts({ kind: "season_complete", season: 2 }, new Date());
    if (!a.ok || !b.ok) throw new Error("expected drafts");
    expect(a.submissions.map((s) => s.external_ref)).toEqual(b.submissions.map((s) => s.external_ref));
    for (const s of a.submissions) expect(outboxIngestSchema.safeParse(s).success).toBe(true);
  });

  it("ad_hoc goes to the general channel with the image as media", () => {
    const built = buildOutboxDrafts(
      {
        kind: "ad_hoc",
        ref: "spring-ride-2027",
        title: "Spring community ride",
        summary: "x".repeat(600),
        url: "https://ridewitus.witus.online/about",
        image_url: "https://cdn.example.com/ride.png",
        platforms: ["bluesky", "facebook"],
      },
      now
    );
    if (!built.ok) throw new Error("expected drafts");
    expect(built.channel).toBe("general");
    expect(built.submissions.map((s) => s.external_ref)).toEqual([
      "rwu-adhoc-spring-ride-2027-bluesky",
      "rwu-adhoc-spring-ride-2027-facebook",
    ]);
    for (const s of built.submissions) {
      expect(outboxIngestSchema.safeParse(s).success).toBe(true);
      expect(s.media_urls).toEqual(["https://cdn.example.com/ride.png"]);
    }
    expect(built.submissions[0].caption.length).toBeLessThanOrEqual(300);
  });

  it("refuses an unknown episode or season", () => {
    expect(buildOutboxDrafts({ kind: "episode_published", slug: "nope" })).toEqual({ ok: false, error: "unknown_episode" });
    expect(buildOutboxDrafts({ kind: "season_complete", season: 9 })).toEqual({ ok: false, error: "unknown_season" });
  });

  it("the old publish body (no external_ref, platform, caption, scheduled_at) is what the Outbox rejected", () => {
    const old = { kind: "episode_published", season: 1, ep: 3, slug: "brakes", title: "Brakes" };
    expect(outboxIngestSchema.safeParse(old).success).toBe(false);
  });
});

describe("sendToOutbox", () => {
  function draft() {
    const built = buildOutboxDrafts({ kind: "episode_published", slug: "brakes", platforms: ["linkedin"] });
    if (!built.ok) throw new Error("expected drafts");
    return built.submissions[0];
  }

  it("stubs per channel when that channel's credentials are missing", async () => {
    process.env.OUTBOX_INGEST_URL = "https://outbox.invalid/api/ingest";
    process.env.OUTBOX_INGEST_SECRET = SECRET;
    process.env.OUTBOX_SOURCE_SLUG = "ride-witus";
    const { fn } = stubFetch({ status: 200, body: { ok: true, id: "x", status: "draft" } });
    expect(await sendToOutbox(draft(), "podcast")).toEqual({ ok: true, stubbed: true });
    expect(fn).not.toHaveBeenCalled();
  });

  it("signs with the podcast pair on the podcast channel and returns the row status", async () => {
    process.env.OUTBOX_INGEST_URL = "https://outbox.invalid/api/ingest";
    process.env.OUTBOX_INGEST_SECRET = "1".repeat(64);
    process.env.OUTBOX_SOURCE_SLUG = "ride-witus";
    process.env.OUTBOX_PODCAST_RWU_SECRET = SECRET;
    process.env.OUTBOX_PODCAST_RWU_SLUG = "ride-witus-podcast";
    const { calls } = stubFetch({ status: 200, body: { ok: true, id: "row-9", status: "draft" } });

    const s = draft();
    expect(await sendToOutbox(s, "podcast")).toEqual({ ok: true, status: 200, id: "row-9", recordStatus: "draft" });
    const c = calls[0];
    expect(c.headers["X-Witus-Source"]).toBe("ride-witus-podcast");
    expectValidSignature(c, SECRET);
    expect(c.body).toBe(JSON.stringify(s));
    expect(outboxIngestSchema.safeParse(JSON.parse(c.body)).success).toBe(true);
  });

  it("refuses a body the Outbox would reject (a queued post under 5 minutes out)", async () => {
    process.env.OUTBOX_INGEST_URL = "https://outbox.invalid/api/ingest";
    process.env.OUTBOX_INGEST_SECRET = SECRET;
    process.env.OUTBOX_SOURCE_SLUG = "ride-witus";
    const { fn } = stubFetch({ status: 200, body: { ok: true, id: "x" } });
    const s = { ...draft(), as_draft: false, scheduled_at: new Date().toISOString() };
    expect(await sendToOutbox(s, "general")).toEqual({ ok: false, error: "invalid_submission" });
    expect(fn).not.toHaveBeenCalled();
  });
});
