import { NextRequest, NextResponse } from "next/server";
import { endSession } from "@/lib/auth/dal";

// /api/auth/signout — destroy the LOCAL session. Nothing else.
//
// This route deliberately knows nothing about the IdP. Global sign-out is two steps and the ORDER
// IS THE SAFETY PROPERTY: the caller awaits this, and only then hands the browser to the IdP's
// end-session endpoint (components/sign-out-button.tsx). If the IdP is unreachable or refuses, the
// person is still signed out here. Doing it the other way round would turn any IdP failure into "I
// clicked sign out and I am still signed in", which is the one outcome a sign-out must never
// produce.
//
// POST only. A GET sign-out is triggerable by any <img> on any page.
//
// CSRF: the session cookie is SameSite=Lax, so a cross-site POST does not carry it and clears
// nothing. The worst a forged request achieves is signing out someone who was not signed in.
//
// Two response shapes, chosen by the Accept header, so both callers work:
//   - `Accept: application/json` -> 200 {ok:true}, for the JS button that has a second step.
//   - anything else -> 303 to /, so a plain <form method="post"> works with JS off.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  await endSession();

  if (request.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
  // 303, not 307: the browser must follow with GET, not repeat the POST.
  return NextResponse.redirect(new URL("/", request.url), {
    status: 303,
    headers: { "Cache-Control": "no-store" },
  });
}
