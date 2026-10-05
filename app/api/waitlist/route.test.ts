import { afterEach, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { POST } from "./route";

// Covers every path that returns before the database is touched. The database paths (rate limit,
// upsert, Inbox notify) need a Neon branch and are verified by hand (plans/02 Phase 0 checklist).

const saved = process.env.DATABASE_URL;
afterEach(() => {
  if (saved === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = saved;
});

function post(body: unknown, raw = false): NextRequest {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ? String(body) : JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/waitlist", () => {
  it("fails closed with 503 when there is no database", async () => {
    delete process.env.DATABASE_URL;
    const res = await POST(post({ email: "a@b.co" }));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, code: "db_not_configured" });
  });

  describe("with a database configured (never reached)", () => {
    const fakeUrl = "postgresql://user:pass@db.invalid/neondb";

    it("rejects a body that is not JSON", async () => {
      process.env.DATABASE_URL = fakeUrl;
      const res = await POST(post("not json", true));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ code: "invalid_body" });
    });

    it("answers a filled honeypot with the normal success and stores nothing", async () => {
      process.env.DATABASE_URL = fakeUrl;
      const res = await POST(post({ email: "bot@spam.example", website: "http://spam.example" }));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, data: { status: "joined" } });
    });

    it("returns a field-level error for a bad email", async () => {
      process.env.DATABASE_URL = fakeUrl;
      const res = await POST(post({ email: "nope" }));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ ok: false, code: "invalid_input", field: "email" });
    });
  });
});
