"use client";

import Link from "next/link";
import {
  APP_HREF,
  OPEN_APP_LABEL,
  OPEN_APP_SHORT_LABEL,
  SIGN_IN_HREF,
  SIGN_IN_LABEL,
} from "@/components/header-links";
import { useSessionAccount } from "@/components/header-session";
import { HeaderSignOutEverywhere } from "@/components/header-sign-out-everywhere";
import { SIGN_OUT_LABEL } from "@/lib/witus-sso";

/**
 * The header's account control (shared UI rule, witus docs/shared-ui-ux-dx.md, "Sign-in control").
 *
 * Signed out, still loading, or the lookup failed: a link named exactly "Sign in" to /signin.
 * Signed in: "Open the app" (to /app) and "Sign out", the same local form POST the app's own header
 * uses, and beside it "Sign out of WitUS everywhere" when this app is a configured WitUS client
 * (BAM, 2026-11-01). The bar carries that third control from `lg` up, where it fits (measured
 * 2026-11-01). From `md` to `lg` it is at the right end of the second row, under "Sign out"
 * (components/header-app-nav.tsx); below `md` it is in the Menu's Account group, beside a copy of
 * "Sign out" (components/header-menu.tsx). The account strip at the foot of every app page keeps
 * its own copy with the help text visible.
 *
 * `signedIn` and `endSessionUrl` let a page that already knows the answers on the server skip the
 * probe; the public pages leave them out and the probe decides after load.
 */
export function HeaderAccount({
  linkClass,
  signedIn: known,
  endSessionUrl: knownEndSessionUrl,
}: {
  linkClass: string;
  signedIn?: boolean;
  endSessionUrl?: string | null;
}) {
  const { signedIn, endSessionUrl } = useSessionAccount(known, knownEndSessionUrl);

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
      {endSessionUrl ? (
        <HeaderSignOutEverywhere endSessionUrl={endSessionUrl} className={`${linkClass} hidden lg:inline-flex`} />
      ) : null}
    </>
  );
}
