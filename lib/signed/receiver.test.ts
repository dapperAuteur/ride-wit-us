/**
 * The receiving helper every signed RideWitUS endpoint runs: per-endpoint secret, the replay
 * window, the source slug, and what a GET and a POST sign. Values are made up.
 */
import { describe, expect, it, vi } from "vitest";
import { MAX_SKEW_SECONDS, signedHeaders } from "./signature";
import { RECEIVERS, SOURCE, readSignedPayload, receiveSigned, verifySignedRequest } from "./receiver";
import { rejectedIds } from "./rejected";

const SECRET = "receiver-test-secret-not-real-0123456789abcdef";
const OTHER_SECRET = "another-test-secret-not-real-0123456789abcdef";
const NOW = 1_793_400_000;

function post(url: string, body: string, h: Record<string, string>) {
  return new Request(url, { method: "POST", headers: h, body });
}

describe("verifySignedRequest", () => {
  const body = JSON.stringify({ events: [] });
  const ok = signedHeaders({ secret: SECRET, source: SOURCE.centenarianos, signed: body, nowSeconds: NOW });

  it("accepts a fresh, correctly signed request from the expected source", () => {
    expect(verifySignedRequest({ signed: body, headers: new Headers({ ...ok }), secret: SECRET, expectedSource: SOURCE.centenarianos, nowSeconds: NOW })).toEqual({
      ok: true,
      source: SOURCE.centenarianos,
    });
  });

  it.each([
    ["stale", NOW + MAX_SKEW_SECONDS + 1, "stale_timestamp"],
    ["future", NOW - MAX_SKEW_SECONDS - 1, "stale_timestamp"],
  ])("rejects a %s timestamp with 401", (_label, now, reason) => {
    expect(verifySignedRequest({ signed: body, headers: new Headers({ ...ok }), secret: SECRET, expectedSource: SOURCE.centenarianos, nowSeconds: now })).toEqual({
      ok: false,
      reason,
      status: 401,
    });
  });

  it("rejects the wrong source slug, a bad format, a mismatch and a missing header", () => {
    const base = { signed: body, secret: SECRET, expectedSource: SOURCE.centenarianos, nowSeconds: NOW };
    expect(verifySignedRequest({ ...base, headers: new Headers({ ...ok, "X-Witus-Source": SOURCE.workWitus }) })).toMatchObject({ reason: "wrong_source", status: 401 });
    expect(verifySignedRequest({ ...base, headers: new Headers({ ...ok, "X-Witus-Signature": ok["X-Witus-Signature"].slice(7) }) })).toMatchObject({
      reason: "bad_signature_format",
      status: 401,
    });
    expect(verifySignedRequest({ ...base, secret: OTHER_SECRET, headers: new Headers({ ...ok }) })).toMatchObject({ reason: "signature_mismatch", status: 401 });
    expect(verifySignedRequest({ ...base, signed: `${body} `, headers: new Headers({ ...ok }) })).toMatchObject({ reason: "signature_mismatch", status: 401 });
    const { "X-Witus-Timestamp": _ts, ...noTs } = ok;
    void _ts;
    expect(verifySignedRequest({ ...base, headers: new Headers(noTs) })).toMatchObject({ reason: "missing_headers", status: 401 });
  });

  it("answers 503 when the secret is unset", () => {
    expect(verifySignedRequest({ signed: body, headers: new Headers({ ...ok }), secret: undefined, expectedSource: SOURCE.centenarianos, nowSeconds: NOW })).toEqual({
      ok: false,
      reason: "no_secret",
      status: 503,
    });
  });
});

describe("readSignedPayload", () => {
  it("a GET signs its path and query exactly as sent, never reordered", async () => {
    const req = new Request("https://ride.example.test/api/v1/work/job-travel?witus_sub=SUB&work_job_ref=JOB&x=a+b");
    expect(await readSignedPayload(req)).toEqual({ signed: "/api/v1/work/job-travel?witus_sub=SUB&work_job_ref=JOB&x=a+b", body: null });
  });

  it("a POST signs its raw body text", async () => {
    const raw = '{ "events":[ ] }';
    expect(await readSignedPayload(post("https://ride.example.test/api/events/calendar-activity", raw, {}))).toEqual({ signed: raw, body: raw });
  });
});

describe("receiveSigned", () => {
  const raw = JSON.stringify({ events: [{ event_id: "cal:1" }] });
  const url = "https://ride.example.test/api/events/calendar-activity";
  const env = { [RECEIVERS.calendarActivity.secretEnv]: SECRET };

  it("each endpoint has its own secret and its one sender", () => {
    expect(RECEIVERS.envelopeBalance).toEqual({ secretEnv: "ENVELOPE_BALANCE_EVENTS_SECRET", source: "centenarianos" });
    expect(RECEIVERS.calendarActivity).toEqual({ secretEnv: "CALENDAR_ACTIVITY_EVENTS_SECRET", source: "centenarianos" });
    expect(RECEIVERS.financeMatch).toEqual({ secretEnv: "FINANCE_MATCH_EVENTS_SECRET", source: "centenarianos" });
    expect(RECEIVERS.workJobTravel).toEqual({ secretEnv: "WORK_JOB_TRAVEL_API_SECRET", source: "work-witus" });
  });

  it("accepts and returns the verified body", async () => {
    const h = signedHeaders({ secret: SECRET, source: SOURCE.centenarianos, signed: raw, nowSeconds: NOW });
    const result = await receiveSigned(post(url, raw, { ...h }), "calendarActivity", { env, nowSeconds: NOW });
    expect(result).toEqual({ ok: true, source: "centenarianos", body: raw });
  });

  it("a request signed with another endpoint's secret is refused with the flat 401", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const h = signedHeaders({ secret: OTHER_SECRET, source: SOURCE.centenarianos, signed: raw, nowSeconds: NOW });
    const result = await receiveSigned(post(url, raw, { ...h }), "calendarActivity", {
      env: { ...env, ENVELOPE_BALANCE_EVENTS_SECRET: OTHER_SECRET },
      nowSeconds: NOW,
    });
    expect(result).toMatchObject({ ok: false, status: 401, envelope: { ok: false, code: "unauthorized", error: "Unauthorized" } });
    expect(String(warn.mock.calls[0])).not.toContain(SECRET);
    warn.mockRestore();
  });

  it("unset secret = 503 not_configured", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const h = signedHeaders({ secret: SECRET, source: SOURCE.centenarianos, signed: raw, nowSeconds: NOW });
    const result = await receiveSigned(post(url, raw, { ...h }), "calendarActivity", { env: {}, nowSeconds: NOW });
    expect(result).toMatchObject({ ok: false, status: 503, envelope: { code: "not_configured" } });
    warn.mockRestore();
  });

  it("Work.WitUS's GET is verified over path plus query; an edited witus_sub fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const path = "/api/v1/work/job-travel?witus_sub=SUB_EXAMPLE&work_job_ref=JOB";
    const h = signedHeaders({ secret: SECRET, source: SOURCE.workWitus, signed: path, nowSeconds: NOW });
    const jobEnv = { WORK_JOB_TRAVEL_API_SECRET: SECRET };
    const good = await receiveSigned(new Request(`https://ride.example.test${path}`, { headers: { ...h } }), "workJobTravel", { env: jobEnv, nowSeconds: NOW });
    expect(good).toEqual({ ok: true, source: "work-witus", body: null });
    const edited = await receiveSigned(
      new Request("https://ride.example.test/api/v1/work/job-travel?witus_sub=SOMEONE_ELSE&work_job_ref=JOB", { headers: { ...h } }),
      "workJobTravel",
      { env: jobEnv, nowSeconds: NOW }
    );
    expect(edited).toMatchObject({ ok: false, status: 401, reason: "signature_mismatch" });
    warn.mockRestore();
  });
});

describe("rejectedIds (port of the CentenarianOS outbox reader)", () => {
  it("reads the object form and the older string form", () => {
    const ids = ["trip:1", "trip:2", "trip:3"];
    expect(rejectedIds({ accepted: 1, rejected: [{ event_id: "trip:1", reason: "unknown_subject" }, { event_id: "trip:2" }] }, ids)).toEqual(
      new Map([
        ["trip:1", "unknown_subject"],
        ["trip:2", "rejected"],
      ])
    );
    expect(rejectedIds({ rejected: ["trip:3: unknown_subject", "trip:2 - invalid_event amount", "nope"] }, ids)).toEqual(
      new Map([
        ["trip:3", "unknown_subject"],
        ["trip:2", "invalid_event amount"],
      ])
    );
  });

  it("an answer without a rejected list rejects nothing", () => {
    expect(rejectedIds({ accepted: 3 }, ["a"]).size).toBe(0);
    expect(rejectedIds(null, ["a"]).size).toBe(0);
  });
});
