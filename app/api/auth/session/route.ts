import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { witusEndSessionUrl } from "@/lib/witus-sso-config";

// /api/auth/session — "is anyone signed in?", for the public header's account control.
//
// WHY A ROUTE AND NOT A COOKIE READ IN THE HEADER. Every public page (home, episodes, seasons,
// about, tune-in) is statically prerendered. Calling getCurrentUser() inside the header would read
// cookies() and turn all of them into per-request renders. Instead the header renders "Sign in" at
// build time and a small client component asks this route after load, which verifies the session
// cookie on the server with the same helper every protected page uses.
//
// Answers `{ signedIn, endSessionUrl }` and nothing else: no email, no name. The header needs to
// know which controls to show, not who the person is. `endSessionUrl` is the IdP logout URL that
// "Sign out of WitUS everywhere" goes to (BAM, 2026-11-01: that control sits beside "Sign out" in
// the header too). It holds only the public client id and this site's return address, the same
// URL every app page already renders; it is null when nobody is signed in or SSO is not configured.
// Any failure answers signed out, so the header falls back to "Sign in".

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let signedIn = false;
  let endSessionUrl: string | null = null;
  try {
    signedIn = (await getCurrentUser()) !== null;
    if (signedIn) endSessionUrl = await witusEndSessionUrl();
  } catch {
    signedIn = false;
    endSessionUrl = null;
  }
  return NextResponse.json(
    { signedIn, endSessionUrl },
    // Per-person answer: never cached by the CDN or shared between visitors.
    { status: 200, headers: { "Cache-Control": "private, no-store" } }
  );
}
