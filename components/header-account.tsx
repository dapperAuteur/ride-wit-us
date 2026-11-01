"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  APP_HREF,
  OPEN_APP_LABEL,
  OPEN_APP_SHORT_LABEL,
  SESSION_PROBE_URL,
  SIGN_IN_HREF,
  SIGN_IN_LABEL,
  readSessionProbe,
} from "@/components/header-links";
import { SIGN_OUT_LABEL } from "@/lib/witus-sso";

/**
 * One probe per page load. Signing in and signing out are both full navigations (the OIDC
 * redirect, the sign-out form's 303), so the module resets whenever the answer could change, and
 * client-side moves between public pages reuse it instead of asking again.
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
 * The header's account control (shared UI rule, witus docs/shared-ui-ux-dx.md, "Sign-in control").
 *
 * Signed out, still loading, or the lookup failed: a link named exactly "Sign in" to /signin.
 * Signed in: "Open the app" (to /app) and "Sign out", the same local form POST the app's own header
 * uses. "Sign out of WitUS everywhere" stays in the app header and on /signed-in, where it has room
 * for its help text.
 *
 * `signedIn` lets a page that already knows the answer on the server skip the probe; the public
 * pages leave it out and the probe decides after load.
 */
export function HeaderAccount({
  linkClass,
  signedIn: known,
}: {
  linkClass: string;
  signedIn?: boolean;
}) {
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

  const signedIn = known ?? probed;

  if (!signedIn) {
    return (
      <Link href={SIGN_IN_HREF} className={`${linkClass} font-semibold`}>
        {SIGN_IN_LABEL}
      </Link>
    );
  }

  return (
    <>
      <Link href={APP_HREF} className={`${linkClass} font-semibold`}>
        {/* display:none drops a span from the accessible name, so each width has one name. */}
        <span className="sm:hidden">{OPEN_APP_SHORT_LABEL}</span>
        <span className="hidden sm:inline">{OPEN_APP_LABEL}</span>
      </Link>
      <form method="post" action="/api/auth/signout" className="contents">
        <button type="submit" className={linkClass}>
          {SIGN_OUT_LABEL}
        </button>
      </form>
    </>
  );
}
