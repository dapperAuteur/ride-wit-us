/**
 * The session token. This app has no database, so this signature IS the authentication — if it can
 * be forged, edited, or replayed past its expiry, anyone is anyone.
 *
 * Offline: no network, no cookies, no Next runtime. Only the sign/verify pair.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_TTL_SECONDS, signSession, verifySessionToken } from "@/lib/auth/session";

const SECRET = "test-secret-not-a-real-one";
let saved: string | undefined;

beforeEach(() => {
  saved = process.env.WITUS_SESSION_SECRET;
  process.env.WITUS_SESSION_SECRET = SECRET;
});

afterEach(() => {
  if (saved === undefined) delete process.env.WITUS_SESSION_SECRET;
  else process.env.WITUS_SESSION_SECRET = saved;
  vi.useRealTimers();
});

const USER = { sub: "witus-sub-123", email: "rider@example.test", name: "Ada Lovelace" };

describe("round trip", () => {
  it("returns exactly the identity that was signed", () => {
    expect(verifySessionToken(signSession(USER))).toEqual(USER);
  });

  it("omits an absent display name rather than inventing one", () => {
    const token = signSession({ sub: "s", email: "a@b.test" });
    expect(verifySessionToken(token)).toEqual({ sub: "s", email: "a@b.test" });
  });
});

describe("a token that should not be trusted", () => {
  it("rejects nothing at all", () => {
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken(null)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("not.a.token")).toBeNull();
    expect(verifySessionToken("only-one-part")).toBeNull();
  });

  it("rejects an edited payload — the whole point of the signature", () => {
    const [header, , signature] = signSession(USER).split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...USER, email: "attacker@example.test", exp: 9_999_999_999 })
    ).toString("base64url");
    expect(verifySessionToken(`${header}.${forged}.${signature}`)).toBeNull();
  });

  it("rejects a token signed with a different key", () => {
    const token = signSession(USER);
    process.env.WITUS_SESSION_SECRET = "a-different-secret";
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects an unsigned 'alg:none' style token", () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({ ...USER, exp: Math.floor(Date.now() / 1000) + 60 })
    ).toString("base64url");
    expect(verifySessionToken(`${header}.${payload}.`)).toBeNull();
  });

  it("rejects a token past its expiry", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = signSession(USER);
    expect(verifySessionToken(token)).toEqual(USER);
    vi.advanceTimersByTime((SESSION_TTL_SECONDS + 1) * 1000);
    expect(verifySessionToken(token)).toBeNull();
  });
});

describe("operator errors are loud, visitor errors are quiet", () => {
  it("throws when the signing secret is missing, and names only the variable", () => {
    delete process.env.WITUS_SESSION_SECRET;
    expect(() => signSession(USER)).toThrowError(/WITUS_SESSION_SECRET/);
  });

  it("never puts the secret in the thrown message", () => {
    delete process.env.WITUS_SESSION_SECRET;
    try {
      signSession(USER);
      expect.unreachable("signSession should have thrown");
    } catch (err) {
      expect(String(err)).not.toContain(SECRET);
    }
  });
});
