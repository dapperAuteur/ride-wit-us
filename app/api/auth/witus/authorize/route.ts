import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { witusEndpoints, witusSsoConfigured, siteOrigin } from "@/lib/witus-sso-config";
import { withAttemptMarker, witusRedirectUri } from "@/lib/witus-sso";

// /api/auth/witus/authorize — the start of "Sign in with WitUS", and the only way into this app.
//
// Generates `state` + a PKCE verifier, stashes both in short-lived httpOnly cookies, and sends the
// browser to the WitUS IdP. The IdP comes back to /api/auth/witus/callback with a code.
//
// PKCE is used even though this is a confidential client with a secret. It costs two cookies and it
// removes the whole class of authorization-code interception, including the one that matters here:
// a code leaking through a redirect chain or a shared browser.
//
// Everything is gated on the app being a fully-configured OIDC client. Unprovisioned, this route
// bounces straight back to /signin with an error the page explains, rather than sending the visitor
// to an IdP that will refuse them.

// Touches node:crypto and sets cookies; must never be cached or prerendered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const b64url = (buf: Buffer) => buf.toString("base64url");

/** 10 minutes: long enough to sign in at the IdP, short enough that an abandoned attempt expires. */
const TRANSIENT_MAX_AGE = 600;

export async function GET(request: NextRequest) {
  // The `?sso=tried` marker is the half of the "Continue as …" loop guard that survives a browser
  // with no usable sessionStorage — see lib/witus-sso.ts.
  const bail = (reason: string) =>
    NextResponse.redirect(new URL(withAttemptMarker(`/signin?error=${reason}`), request.url));

  if (!witusSsoConfigured()) return bail("witus_not_configured");
  const endpoints = witusEndpoints();
  if (!endpoints) return bail("witus_not_configured");

  // Must EXACTLY match a redirect URI registered for this client in the IdP. Built from the same
  // origin the sign-out flow uses, so the two can never disagree.
  const redirectUri = witusRedirectUri(await siteOrigin());

  const state = b64url(crypto.randomBytes(16));
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());

  const authUrl = new URL(endpoints.authorize);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", process.env.WITUS_OIDC_CLIENT_ID as string);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const res = NextResponse.redirect(authUrl.toString());
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TRANSIENT_MAX_AGE,
  };
  res.cookies.set("witus_oauth_state", state, cookieOpts);
  res.cookies.set("witus_oauth_verifier", verifier, cookieOpts);
  return res;
}
