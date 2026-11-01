"use client";

import { useEffect, useState } from "react";
import { SESSION_PROBE_URL, SIGNED_OUT, readSessionAccount, type SessionProbe } from "@/components/header-links";

/**
 * One probe per page load, shared by every header piece that needs it (account control, app nav,
 * menu). Signing in and signing out are both full navigations (the OIDC redirect, the sign-out
 * form's 303), so the module resets whenever the answer could change, and client-side moves
 * between public pages reuse it instead of asking again.
 */
let probe: Promise<SessionProbe> | null = null;

function probeSession(): Promise<SessionProbe> {
  probe ??= fetch(SESSION_PROBE_URL, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { accept: "application/json" },
  })
    .then((res) => (res.ok ? res.json() : null))
    .then(readSessionAccount)
    .catch(() => SIGNED_OUT);
  return probe;
}

/**
 * The visitor's session as the header sees it. `knownSignedIn` and `knownEndSessionUrl` are the
 * server's answers when the page has them (it renders per request anyway); without them the probe
 * decides after load. Until it answers, and if it fails, the visitor reads as signed out, so the
 * header shows "Sign in" and no "Sign out of WitUS everywhere".
 *
 * A page that knows only `signedIn` (true) still asks the probe for the end-session URL.
 */
export function useSessionAccount(knownSignedIn?: boolean, knownEndSessionUrl?: string | null): SessionProbe {
  const [probed, setProbed] = useState<SessionProbe>(SIGNED_OUT);
  const fullyKnown = knownSignedIn === false || (knownSignedIn === true && knownEndSessionUrl !== undefined);

  useEffect(() => {
    if (fullyKnown) return;
    let live = true;
    void probeSession().then((answer) => {
      if (live) setProbed(answer);
    });
    return () => {
      live = false;
    };
  }, [fullyKnown]);

  if (knownSignedIn === false) return SIGNED_OUT;
  if (knownSignedIn === true) {
    return { signedIn: true, endSessionUrl: knownEndSessionUrl !== undefined ? knownEndSessionUrl : probed.endSessionUrl };
  }
  return probed;
}

/** Is someone signed in? Same rules as useSessionAccount. */
export function useSignedIn(known?: boolean): boolean {
  return useSessionAccount(known, known === undefined ? undefined : null).signedIn;
}
