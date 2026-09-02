/**
 * The session token — sign and verify.
 *
 * THERE IS NO DATABASE AND NO USER TABLE. A RideWitUS session is the identity the WitUS IdP handed
 * us at the end of the OIDC code flow, serialized into a compact HS256 JWT and put in one
 * httpOnly + Secure + SameSite=Lax cookie. That is the whole of this app's persistence layer for
 * people. Nothing is written anywhere; signing out is deleting a cookie.
 *
 * WHY NOT `jose` (or any dependency). The token is symmetric, minted and verified by this same
 * process, and never leaves it. Node's `crypto` does HMAC-SHA256 and constant-time comparison in
 * the standard library, so the whole implementation is the sixty lines below, and this repo keeps
 * a dependency list it can read in one screen.
 *
 * WHY JWT SHAPE AT ALL, then. Because it is inspectable: BAM can paste a cookie into jwt.io and
 * see `sub`/`exp` rather than a bespoke blob nobody can decode when something is wrong.
 *
 * `node:crypto` only — no `next/headers`, so this module is importable from tests directly. Cookie
 * reading and writing lives in `dal.ts`.
 */
import crypto from "node:crypto";

/** Name of the httpOnly cookie that carries the session token. */
export const SESSION_COOKIE = "rwu_session";

/** Session lifetime — also the cookie `Max-Age` and the token expiry. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * What a signed-in person is, here. Only what the IdP told us, only what a page might display.
 *
 * `sub` is the IdP's stable subject identifier and is the ONLY field anything should key on: an
 * email can be changed at the IdP, a name is free text.
 */
export interface SessionUser {
  /** IdP subject identifier — stable, opaque, the identity key. */
  sub: string;
  email: string;
  /** Display name, if the IdP had one. Never required, never a key. */
  name?: string;
}

interface SessionClaims extends SessionUser {
  iat: number;
  exp: number;
}

const HEADER = base64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

/**
 * The signing key. Read per call rather than at module scope so an unprovisioned deploy fails only
 * when someone actually tries to sign in, not at build time — every public page in this app is
 * statically prerendered and must keep building with no auth env set at all.
 */
function signingKey(): Buffer {
  const secret = process.env.WITUS_SESSION_SECRET;
  if (!secret) {
    // Message names the variable, never a value, and this only ever reaches a server log.
    throw new Error("WITUS_SESSION_SECRET is not set; cannot sign or verify a session");
  }
  return Buffer.from(secret, "utf8");
}

function sign(input: string): string {
  return base64url(crypto.createHmac("sha256", signingKey()).update(input).digest());
}

/** Mint a session token for `user`, valid for `SESSION_TTL_SECONDS`. */
export function signSession(user: SessionUser, now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const claims: SessionClaims = {
    sub: user.sub,
    email: user.email,
    ...(user.name ? { name: user.name } : {}),
    iat,
    exp: iat + SESSION_TTL_SECONDS,
  };
  const body = `${HEADER}.${base64url(Buffer.from(JSON.stringify(claims)))}`;
  return `${body}.${sign(body)}`;
}

/**
 * Verify a session token and return its user, or `null` if it is missing, malformed, expired, or
 * signed with a different key. Never throws for a bad token — only for a missing secret, which is
 * an operator error rather than a visitor one.
 */
export function verifySessionToken(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;

  // Constant-time compare, and only after a length check: `timingSafeEqual` throws on a length
  // mismatch, which would itself be an oracle if it escaped as a 500.
  const expected = Buffer.from(sign(`${header}.${payload}`), "utf8");
  const actual = Buffer.from(signature, "utf8");
  if (expected.length !== actual.length) return null;
  if (!crypto.timingSafeEqual(expected, actual)) return null;

  let claims: SessionClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionClaims;
  } catch {
    return null;
  }
  if (typeof claims.sub !== "string" || !claims.sub) return null;
  if (typeof claims.email !== "string" || !claims.email) return null;
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now()) return null;

  return {
    sub: claims.sub,
    email: claims.email,
    ...(typeof claims.name === "string" && claims.name ? { name: claims.name } : {}),
  };
}
