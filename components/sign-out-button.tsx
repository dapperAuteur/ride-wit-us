"use client";

import { useState } from "react";

const BUTTON_CLASS =
  "inline-flex items-center min-h-11 px-4 py-2 border-2 border-[#221E1B] bg-[#fff8e8] text-[#221E1B] font-semibold rounded-lg transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]";

/**
 * A sign-out control, in two shapes decided on the SERVER.
 *
 * `endSessionUrl` null — this app is not a configured WitUS OIDC client, so there is no shared
 * session to end. Sign-out is a plain form POST with no client JS on the path, label "Sign out".
 *
 * `endSessionUrl` set — GLOBAL SIGN-OUT (BAM's decision, 2026-08-30: signing out of one WitUS app
 * signs you out of every WitUS app). We destroy the local session, then hand off to the IdP's
 * end-session endpoint, which ends the shared session and returns here. Label "Sign out of WitUS",
 * because a control that signs you out of a dozen other apps should say so before it is clicked.
 *
 * ORDER IS THE SAFETY PROPERTY, and it is the reason this branch is client-side at all: the local
 * session is destroyed and AWAITED first, so if the IdP is unreachable, refuses the request, or the
 * redirect never completes, the person is still signed out HERE. Handing off first would turn any
 * IdP failure into "I clicked sign out and I am still signed in".
 */
export function SignOutButton({ endSessionUrl = null }: { endSessionUrl?: string | null } = {}) {
  const [pending, setPending] = useState(false);

  if (!endSessionUrl) {
    return (
      <form method="post" action="/api/auth/signout">
        <button type="submit" className={BUTTON_CLASS}>
          Sign out
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          // Local first. Everything below this line is best-effort.
          await fetch("/api/auth/signout", {
            method: "POST",
            headers: { accept: "application/json" },
            cache: "no-store",
          });
        } catch {
          // A failed request here means the cookie may still be set. Handing off to the IdP anyway
          // is still the better outcome: the shared session ends, and the stale local cookie is a
          // signature over an identity the IdP no longer vouches for.
        }
        // A full navigation, not a router push: this leaves our origin for the IdP, which then
        // returns to the post_logout_redirect_uri already baked into the URL on the server
        // (lib/witus-sso-config.ts). If that URI is not registered for this client the IdP keeps
        // the visitor on its own page instead of coming back — signed out of both places either way.
        window.location.assign(endSessionUrl);
      }}
      className={BUTTON_CLASS}
    >
      {pending ? "Signing out…" : "Sign out of WitUS"}
    </button>
  );
}
