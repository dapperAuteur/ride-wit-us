/**
 * The auth data-access layer — the one place server code asks "who is signed in?", and the only
 * place the session cookie is written or cleared.
 *
 * There is no database behind this. `getCurrentUser()` verifies a signature on a cookie; that is
 * the entire read path. Every other module should call these rather than reach for the cookie
 * itself, so the verification can never be skipped by accident.
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSession,
  verifySessionToken,
  type SessionUser,
} from "./session";

/**
 * The signed-in user, or `null`. Memoized for the render pass so repeated calls within one request
 * verify the signature only once.
 *
 * Returns null rather than throwing when the app is unprovisioned: with no `WITUS_SESSION_SECRET`
 * there can be no valid session, and a page asking "is anyone signed in?" should hear "no", not
 * crash.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return verifySessionToken(token);
  } catch {
    return null;
  }
});

/**
 * Issue a session cookie — called by the OIDC callback and nothing else.
 *
 * Only callable from a Route Handler or Server Action; Next forbids cookie writes during a page
 * render.
 */
export async function startSession(user: SessionUser): Promise<void> {
  const token = signSession(user);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    // `secure` off on localhost only — a Secure cookie is never stored over plain http, so dev
    // sign-in would silently never take.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Clear the session cookie. This is the whole of "sign out, locally". */
export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** For pages: return the user, or redirect to /signin. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

/**
 * For Route Handlers: return `{ user }`, or a 401 `NextResponse` the handler should return as-is.
 *
 * Shaped as a union rather than a throw so the 401 body matches this repo's other handlers
 * (`{ ok: false, error }`) instead of Next's default error page.
 */
export async function requireApiUser(): Promise<{ user: SessionUser } | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return { user };
}
