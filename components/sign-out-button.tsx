"use client";

import { useId, useState } from "react";
import {
  SIGN_OUT_EVERYWHERE_HELP,
  SIGN_OUT_EVERYWHERE_LABEL,
  SIGN_OUT_LABEL,
  signOutEverywhere,
} from "@/lib/witus-sso";

const BUTTON_CLASS =
  "inline-flex items-center min-h-11 px-4 py-2 border-2 border-[#221E1B] bg-[#fff8e8] text-[#221E1B] font-semibold rounded-lg transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]";

// Secondary: no fill, thinner border, so "Sign out" stays the obvious control.
const SECONDARY_BUTTON_CLASS =
  "inline-flex items-center min-h-11 px-3 py-2 border border-[#221E1B]/60 text-[#221E1B] font-medium rounded-lg underline-offset-2 hover:underline disabled:opacity-60 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]";

/**
 * The sign-out controls (BAM, 2026-10-29, witus task 128 option (b)).
 *
 * "Sign out" — always rendered, always exactly that name. A plain form POST to
 * /api/auth/signout with no client JS on the path: it ends ONLY this app's session and lands on
 * `/` (the route's 303). It never visits the IdP, so the WitUS session and other WitUS apps stay
 * signed in.
 *
 * "Sign out of WitUS everywhere" — rendered beside it only when `endSessionUrl` is set, i.e. this
 * app is a configured WitUS OIDC client (decided on the SERVER in lib/witus-sso-config.ts, which
 * also bakes `client_id` and `post_logout_redirect_uri` into the URL).
 */
export function SignOutButton({ endSessionUrl = null }: { endSessionUrl?: string | null } = {}) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <form method="post" action="/api/auth/signout">
        <button type="submit" className={BUTTON_CLASS}>
          {SIGN_OUT_LABEL}
        </button>
      </form>
      {endSessionUrl ? <SignOutEverywhereButton endSessionUrl={endSessionUrl} /> : null}
    </div>
  );
}

/**
 * Ends this app's session, then the shared WitUS session at the IdP. ORDER IS THE SAFETY PROPERTY,
 * and it is the reason this control is client-side at all: the local session is destroyed and
 * AWAITED first (see `signOutEverywhere` in lib/witus-sso.ts), so if the IdP is unreachable,
 * refuses the request, or the redirect never completes, the person is still signed out HERE.
 */
export function SignOutEverywhereButton({ endSessionUrl }: { endSessionUrl: string }) {
  const [pending, setPending] = useState(false);
  const helpId = useId();

  return (
    <div className="max-w-xs">
      <button
        type="button"
        disabled={pending}
        aria-describedby={helpId}
        onClick={() => {
          setPending(true);
          void signOutEverywhere({
            // Local first. Everything after it is best-effort.
            signOutLocal: () =>
              fetch("/api/auth/signout", {
                method: "POST",
                headers: { accept: "application/json" },
                cache: "no-store",
              }),
            // A full navigation, not a router push: this leaves our origin for the IdP, which then
            // returns to the post_logout_redirect_uri already baked into the URL on the server
            // (lib/witus-sso-config.ts). If that URI is not registered for this client the IdP
            // keeps the visitor on its own page instead of coming back — signed out of both places
            // either way.
            navigate: (url) => window.location.assign(url),
            endSessionUrl,
          });
        }}
        className={SECONDARY_BUTTON_CLASS}
      >
        {pending ? "Signing out…" : SIGN_OUT_EVERYWHERE_LABEL}
      </button>
      <p id={helpId} className="mt-1 text-xs text-[#221E1B]/70">
        {SIGN_OUT_EVERYWHERE_HELP}
      </p>
    </div>
  );
}
