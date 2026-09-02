import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { startSession } from "@/lib/auth/dal";
import { witusEndpoints, witusSsoConfigured, siteOrigin } from "@/lib/witus-sso-config";
import { withAttemptMarker, witusRedirectUri } from "@/lib/witus-sso";

// /api/auth/witus/callback — the end of "Sign in with WitUS".
//
//   1. verify `state` against the cookie the authorize route set,
//   2. exchange the code (+ PKCE verifier) for tokens,
//   3. read the claims from the IdP's userinfo endpoint, server-to-server,
//   4. mint this app's own session cookie.
//
// WHY USERINFO AND NOT THE id_token. Reading the id_token client-side would mean verifying an RS256
// signature against the IdP's JWKS — a dependency, a cache, and a key-rotation failure mode — to
// learn exactly what one authenticated back-channel request returns. The tokens are used once here
// and discarded; nothing about the IdP session is kept.
//
// THERE IS NO USER TABLE TO FIND-OR-CREATE AGAINST. The session is the claims, signed. A person who
// has never visited before and one who visits daily produce identical work in this handler.
//
// THERE IS ALSO NO ALLOW-LIST. Anyone with a WitUS account can sign in, which is the intended
// behaviour for a public curriculum site — the session grants access to /signed-in and nothing
// else today. When the CentenarianOS travel module lands and there is something worth authorizing,
// that gate belongs on the resource, not here.

// Reads cookies, calls the IdP, writes a session cookie; never cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UserInfo {
  sub?: string;
  email?: string;
  name?: string;
  preferred_username?: string;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("witus_oauth_state")?.value;
  const verifier = cookieStore.get("witus_oauth_verifier")?.value;

  const clearTransient = () => {
    cookieStore.set({ name: "witus_oauth_state", value: "", maxAge: 0, path: "/" });
    cookieStore.set({ name: "witus_oauth_verifier", value: "", maxAge: 0, path: "/" });
  };

  // Every path out of this handler that is not a completed sign-in carries `?sso=tried`. It is the
  // half of the "Continue as <name>" loop guard that does not depend on sessionStorage: without it,
  // a stale IdP session gives probe -> "Continue as X" -> click -> the IdP cannot finish -> back to
  // /signin -> probe -> forever. See lib/witus-sso.ts.
  const fail = (reason: string) => {
    clearTransient();
    return NextResponse.redirect(new URL(withAttemptMarker(`/signin?error=${reason}`), request.url));
  };

  if (!witusSsoConfigured()) return fail("witus_not_configured");
  const endpoints = witusEndpoints();
  if (!endpoints) return fail("witus_not_configured");

  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    return fail("witus_state");
  }

  // Must be byte-identical to what the authorize route sent, or the exchange is `invalid_grant`.
  const redirectUri = witusRedirectUri(await siteOrigin());

  let claims: UserInfo;
  try {
    const tokenRes = await fetch(endpoints.token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: process.env.WITUS_OIDC_CLIENT_ID as string,
        client_secret: process.env.WITUS_OIDC_CLIENT_SECRET as string,
        code_verifier: verifier,
      }),
      cache: "no-store",
    });
    if (!tokenRes.ok) return fail("witus_token");
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) return fail("witus_token");

    const userinfoRes = await fetch(endpoints.userinfo, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      cache: "no-store",
    });
    if (!userinfoRes.ok) return fail("witus_userinfo");
    claims = (await userinfoRes.json()) as UserInfo;
  } catch {
    // No binding: a fetch error's message can carry the URL it was called with, and that URL
    // carries the authorization code. Nothing from it reaches the log or the response.
    // eslint-disable-next-line no-console
    console.error("[auth] witus token or userinfo request failed");
    return fail("witus_unreachable");
  }

  const email = claims.email?.trim().toLowerCase();
  if (!claims.sub || !email) return fail("witus_claims");

  await startSession({
    sub: claims.sub,
    email,
    name: claims.name?.trim() || claims.preferred_username?.trim() || undefined,
  });

  clearTransient();
  return NextResponse.redirect(new URL("/signed-in", request.url));
}
