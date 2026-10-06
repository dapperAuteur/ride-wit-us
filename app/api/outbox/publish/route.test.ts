import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

// The session lookup reads cookies(), which needs a request scope; stand it in.
const currentUser = vi.hoisted(() => ({ value: null as null | { email: string } }));
vi.mock("@/lib/auth/dal", () => ({ getCurrentUser: async () => currentUser.value }));

import { POST } from "./route";

const KEYS = ["OUTBOX_PUBLISH_TOKEN", "OUTBOX_TRIGGER_ENABLED", "ADMIN_EMAIL", "OUTBOX_INGEST_URL", "OUTBOX_INGEST_SECRET", "OUTBOX_SOURCE_SLUG", "OUTBOX_PODCAST_RWU_SECRET", "OUTBOX_PODCAST_RWU_SLUG"];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  currentUser.value = null;
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("no network in tests"); }));
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function post(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/outbox/publish", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const episode = { kind: "episode_published", slug: "brakes" };

describe("POST /api/outbox/publish", () => {
  it("is closed to anonymous callers", async () => {
    const res = await POST(post(episode));
    expect(res.status).toBe(401);
  });

  it("is closed to signed-in non-admins", async () => {
    process.env.ADMIN_EMAIL = "owner@example.com";
    currentUser.value = { email: "someone@example.com" };
    expect((await POST(post(episode))).status).toBe(403);
  });

  it("rejects a wrong bearer token, and any bearer token when none is configured", async () => {
    expect((await POST(post(episode, { authorization: "Bearer guess" }))).status).toBe(401);
    process.env.OUTBOX_PUBLISH_TOKEN = "right-token";
    expect((await POST(post(episode, { authorization: "Bearer wrong" }))).status).toBe(401);
  });

  it("sends nothing while the kill-switch is off", async () => {
    process.env.OUTBOX_PUBLISH_TOKEN = "right-token";
    const res = await POST(post(episode, { authorization: "Bearer right-token" }));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: "outbox_triggers_disabled" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("validates the body and the episode", async () => {
    process.env.OUTBOX_PUBLISH_TOKEN = "right-token";
    process.env.OUTBOX_TRIGGER_ENABLED = "true";
    const auth = { authorization: "Bearer right-token" };
    expect((await POST(post({ kind: "nope" }, auth))).status).toBe(400);
    expect((await POST(post({ kind: "episode_published", slug: "missing" }, auth))).status).toBe(404);
  });

  it("builds one draft per platform for the admin (stubbed without Outbox env)", async () => {
    process.env.ADMIN_EMAIL = "owner@example.com";
    process.env.OUTBOX_TRIGGER_ENABLED = "true";
    currentUser.value = { email: "Owner@Example.com" };
    const res = await POST(post(episode));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, kind: "episode_published", channel: "podcast" });
    expect(json.drafts.map((d: { external_ref: string }) => d.external_ref)).toEqual([
      "rwu-episode-brakes-linkedin",
      "rwu-episode-brakes-twitter",
      "rwu-episode-brakes-bluesky",
    ]);
    expect(json.drafts.every((d: { stubbed: boolean }) => d.stubbed)).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
});
