import { describe, expect, it } from "vitest";
import { clientIp, rateLimitKey } from "@/lib/rate-limit";
import {
  NOTE_MAX,
  WAITLIST_FORM_TYPE,
  buildWaitlistInboxSubmission,
  isHoneypotFilled,
  parseWaitlist,
} from "./validate";

describe("parseWaitlist", () => {
  it("trims and lowercases the email and keeps the note", () => {
    expect(parseWaitlist({ email: "  BAM@Example.COM ", note: " commuter " })).toEqual({
      ok: true,
      data: { email: "bam@example.com", note: "commuter" },
    });
  });

  it("treats a blank note as none", () => {
    expect(parseWaitlist({ email: "a@b.co", note: "   " })).toEqual({ ok: true, data: { email: "a@b.co", note: null } });
  });

  it("asks for an email when it is missing", () => {
    expect(parseWaitlist({})).toMatchObject({ ok: false, field: "email", error: "Enter your email address." });
    expect(parseWaitlist(null)).toMatchObject({ ok: false, field: "email" });
  });

  it("rejects a malformed email", () => {
    expect(parseWaitlist({ email: "not-an-email" })).toMatchObject({ ok: false, field: "email" });
  });

  it("rejects an overlong note", () => {
    expect(parseWaitlist({ email: "a@b.co", note: "x".repeat(NOTE_MAX + 1) })).toMatchObject({
      ok: false,
      field: "note",
    });
  });
});

describe("honeypot", () => {
  it("is filled only by a non-blank website field", () => {
    expect(isHoneypotFilled({ website: "http://spam" })).toBe(true);
    expect(isHoneypotFilled({ website: "  " })).toBe(false);
    expect(isHoneypotFilled({})).toBe(false);
    expect(isHoneypotFilled("x")).toBe(false);
  });
});

describe("buildWaitlistInboxSubmission", () => {
  it("matches the WitUS Inbox ingest shape", () => {
    const s = buildWaitlistInboxSubmission({
      email: "a@b.co",
      note: null,
      joinedAt: new Date("2026-10-05T12:00:00Z"),
    });
    expect(s).toEqual({
      form_type: WAITLIST_FORM_TYPE,
      submitter_email: "a@b.co",
      priority: "normal",
      payload: {
        app: "RideWitUS",
        list: "mobility_app_waitlist",
        email: "a@b.co",
        note: null,
        joined_at: "2026-10-05T12:00:00.000Z",
      },
    });
  });
});

describe("rate limit helpers", () => {
  it("reads the first forwarded IP, then x-real-ip", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe("203.0.113.9");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });

  it("never puts the raw IP in the key", () => {
    const key = rateLimitKey("waitlist", "203.0.113.9", "salt");
    expect(key.startsWith("waitlist:")).toBe(true);
    expect(key).not.toContain("203.0.113.9");
  });

  it("is stable for the same input and differs by salt and scope", () => {
    expect(rateLimitKey("waitlist", "1.2.3.4", "s")).toBe(rateLimitKey("waitlist", "1.2.3.4", "s"));
    expect(rateLimitKey("waitlist", "1.2.3.4", "s")).not.toBe(rateLimitKey("waitlist", "1.2.3.4", "t"));
    expect(rateLimitKey("waitlist", "1.2.3.4", "s")).not.toBe(rateLimitKey("other", "1.2.3.4", "s"));
  });
});
