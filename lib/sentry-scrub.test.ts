import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { isSensitiveUrl, redactText, scrubEvent } from "./sentry-scrub";

// The one thing these tests are for: prove that nothing a RideWitUS visitor typed, and no credential
// this app holds, can ride an error report out to a third party. Each assertion names a concrete
// value from the real code paths (lib/witus-sender.ts, app/api/inbox-ingest/route.ts) rather than a
// generic placeholder, so a regression fails on the thing that would actually leak.

const SUBSCRIBER_EMAIL = "rider@example.com";
const HMAC = "sha256=3a7f1c2b9d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff";
const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk";

function baseEvent(): ErrorEvent {
  return { type: undefined } as ErrorEvent;
}

describe("redactText", () => {
  it("removes an email address from free text", () => {
    const out = redactText(`Mailgun rejected recipient ${SUBSCRIBER_EMAIL}`);
    expect(out).not.toContain(SUBSCRIBER_EMAIL);
    expect(out).not.toContain("example.com");
  });

  it("removes the X-Witus-Signature HMAC this app signs Inbox posts with", () => {
    const out = redactText(`inbox rejected signature ${HMAC}`);
    expect(out).not.toContain(HMAC);
    expect(out).not.toContain("3a7f1c2b");
  });

  it("removes a JWT and a Bearer credential", () => {
    const out = redactText(`Authorization: Bearer ${JWT}`);
    expect(out).not.toContain(JWT);
    expect(out).not.toContain("eyJhbGciOiJIUzI1NiJ9");
  });

  it("removes a labelled secret", () => {
    const out = redactText("INBOX_INGEST_SECRET is s3cr3t-signing-key");
    expect(out).not.toContain("s3cr3t-signing-key");
  });

  it("removes location detail: coordinates and street addresses", () => {
    const out = redactText("host_listen_party at 4200 North Meridian Street, lat: 39.8403, lng=-86.1581");
    expect(out).not.toContain("4200 North Meridian Street");
    expect(out).not.toContain("39.8403");
    expect(out).not.toContain("-86.1581");
  });

  it("redacts a token-bearing URL but keeps an ordinary episode URL readable", () => {
    const out = redactText(
      "failed https://ridewitus.witus.online/api/inbox-ingest?token=abc123 after https://ridewitus.witus.online/episodes/brakes"
    );
    expect(out).not.toContain("abc123");
    expect(out).toContain("/episodes/brakes");
  });

  it("is idempotent, so a re-scrubbed event never re-mangles its own placeholders", () => {
    const once = redactText(`contact ${SUBSCRIBER_EMAIL}`);
    expect(redactText(once)).toBe(once);
  });
});

describe("isSensitiveUrl", () => {
  it("flags secret-bearing query params, redemption paths, and unparseable input", () => {
    expect(isSensitiveUrl("https://x.test/a?signature=deadbeef")).toBe(true);
    expect(isSensitiveUrl("https://x.test/a?email=rider%40example.com")).toBe(true);
    expect(isSensitiveUrl("https://x.test/unsubscribe/xyz")).toBe(true);
    expect(isSensitiveUrl("not a url at all")).toBe(true);
  });

  it("leaves an ordinary public page URL alone", () => {
    expect(isSensitiveUrl("https://ridewitus.witus.online/seasons/1")).toBe(false);
  });
});

describe("scrubEvent", () => {
  it("drops user identity and network origin", () => {
    const event = baseEvent();
    event.user = { id: "u1", email: SUBSCRIBER_EMAIL, ip_address: "203.0.113.7", username: "rider" };
    const out = scrubEvent(event);
    expect(out.user?.email).toBeUndefined();
    expect(out.user?.ip_address).toBeUndefined();
    expect(out.user?.username).toBeUndefined();
    expect(out.user?.id).toBe("u1");
  });

  it("drops the whole request body, cookies, and credential headers", () => {
    const event = baseEvent();
    event.request = {
      url: "https://ridewitus.witus.online/api/inbox-ingest",
      cookies: { session: "abc" },
      data: {
        form_type: "host_listen_party",
        org_name: "Northside Bike Co-op",
        contact: SUBSCRIBER_EMAIL,
        neighborhood: "Martindale-Brightwood",
      },
      headers: {
        host: "ridewitus.witus.online",
        cookie: "session=abc",
        authorization: `Bearer ${JWT}`,
        "X-Witus-Signature": HMAC,
        "x-forwarded-for": "203.0.113.7",
      },
    };
    const out = scrubEvent(event);
    const serialized = JSON.stringify(out);

    expect(out.request?.data).toBeUndefined();
    expect(out.request?.cookies).toBeUndefined();
    expect(out.request?.headers).toEqual({ host: "ridewitus.witus.online" });
    expect(serialized).not.toContain(SUBSCRIBER_EMAIL);
    expect(serialized).not.toContain("Martindale-Brightwood");
    expect(serialized).not.toContain(HMAC);
    expect(serialized).not.toContain("203.0.113.7");
  });

  it("scrubs the message, exception values, extra, tags, and breadcrumbs", () => {
    const event = baseEvent();
    event.message = `notify signup failed for ${SUBSCRIBER_EMAIL}`;
    event.exception = { values: [{ type: "Error", value: `inbox 401 for signature ${HMAC}` }] };
    event.extra = { neighborhood: "Martindale-Brightwood", note: `reply to ${SUBSCRIBER_EMAIL}` };
    event.tags = { email: SUBSCRIBER_EMAIL, route: "/api/inbox-ingest" };
    event.breadcrumbs = [
      { message: `POST https://inbox.witus.online/api/ingest?token=abc123 as ${SUBSCRIBER_EMAIL}` },
      { data: { contact: SUBSCRIBER_EMAIL, status: 401 } },
    ];

    const serialized = JSON.stringify(scrubEvent(event));
    expect(serialized).not.toContain(SUBSCRIBER_EMAIL);
    expect(serialized).not.toContain(HMAC);
    expect(serialized).not.toContain("Martindale-Brightwood");
    expect(serialized).not.toContain("abc123");
    // Still useful for triage: the non-sensitive tag survives.
    expect(serialized).toContain("/api/inbox-ingest");
  });

  it("never returns null, so the crash signal survives the scrub", () => {
    const event = baseEvent();
    event.message = `everything sensitive: ${SUBSCRIBER_EMAIL} ${HMAC}`;
    expect(scrubEvent(event)).toBeTruthy();
  });
});
