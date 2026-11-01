import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";

// /api/auth/session — "is anyone signed in?", for the public header's account control.
//
// WHY A ROUTE AND NOT A COOKIE READ IN THE HEADER. Every public page (home, episodes, seasons,
// about, tune-in) is statically prerendered. Calling getCurrentUser() inside the header would read
// cookies() and turn all of them into per-request renders. Instead the header renders "Sign in" at
// build time and a small client component asks this route after load, which verifies the session
// cookie on the server with the same helper every protected page uses.
//
// Answers a boolean and nothing else: no email, no name. The header needs to know which control to
// show, not who the person is. Any failure answers `false`, so the header falls back to "Sign in".

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let signedIn = false;
  try {
    signedIn = (await getCurrentUser()) !== null;
  } catch {
    signedIn = false;
  }
  return NextResponse.json(
    { signedIn },
    // Per-person answer: never cached by the CDN or shared between visitors.
    { status: 200, headers: { "Cache-Control": "private, no-store" } }
  );
}
