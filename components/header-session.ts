"use client";

import { useEffect, useState } from "react";
import { SESSION_PROBE_URL, readSessionProbe } from "@/components/header-links";

/**
 * One probe per page load, shared by every header piece that needs it (account control, app nav,
 * menu). Signing in and signing out are both full navigations (the OIDC redirect, the sign-out
 * form's 303), so the module resets whenever the answer could change, and client-side moves
 * between public pages reuse it instead of asking again.
 */
let probe: Promise<boolean> | null = null;

function probeSession(): Promise<boolean> {
  probe ??= fetch(SESSION_PROBE_URL, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { accept: "application/json" },
  })
    .then((res) => (res.ok ? res.json() : null))
    .then(readSessionProbe)
    .catch(() => false);
  return probe;
}

/**
 * Is someone signed in? `known` is the server's answer when the page has one (it renders per
 * request anyway); without it the probe decides after load. Until it answers, and if it fails,
 * the answer is false, so the header shows "Sign in".
 */
export function useSignedIn(known?: boolean): boolean {
  const [probed, setProbed] = useState(false);

  useEffect(() => {
    if (known !== undefined) return;
    let live = true;
    void probeSession().then((answer) => {
      if (live) setProbed(answer);
    });
    return () => {
      live = false;
    };
  }, [known]);

  return known ?? probed;
}
