"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_LINKS, isCurrentLink } from "@/components/header-links";
import { useSessionAccount } from "@/components/header-session";
import { HeaderSignOutEverywhere } from "@/components/header-sign-out-everywhere";
import { cn } from "@/lib/utils";

/**
 * The header's second row when someone is signed in, from `md` up (below `md` all of it is in the
 * Menu): the app's destinations, and from `md` to `lg` "Sign out of WitUS everywhere" at the right
 * end, under "Sign out". From `lg` up that control sits in the bar itself, beside "Sign out"
 * (components/header-account.tsx); between `md` and `lg` the bar is already full (measured
 * 2026-11-01: "Sign out" ends at the bar's right padding from 768 to 1000px).
 *
 * The same row on the podcast pages and inside /app, so a signed-in rider can move between the two
 * without hunting. On a statically prerendered public page it appears once the session probe
 * answers. `showLinks` false (the app cannot serve this rider yet) keeps only the control.
 */
export function HeaderAppNav({
  signedIn: known,
  endSessionUrl: knownEndSessionUrl,
  showLinks = true,
  linkClass,
  currentClass,
}: {
  signedIn?: boolean;
  endSessionUrl?: string | null;
  showLinks?: boolean;
  linkClass: string;
  currentClass: string;
}) {
  const { signedIn, endSessionUrl } = useSessionAccount(known, knownEndSessionUrl);
  const pathname = usePathname();
  if (!signedIn || (!showLinks && !endSessionUrl)) return null;

  return (
    <div className={cn("hidden md:block", !showLinks && "lg:hidden")}>
      <div className="max-w-5xl mx-auto px-6 pb-2 flex flex-wrap items-center gap-1 text-sm">
        {showLinks ? (
          <nav aria-label="App">
            <ul className="flex flex-wrap items-center gap-1">
              {APP_LINKS.map((l) => {
                const current = isCurrentLink(pathname, l.href);
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      aria-current={current ? "page" : undefined}
                      className={current ? `${linkClass} ${currentClass}` : linkClass}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
        {endSessionUrl ? (
          <div className="ml-auto flex lg:hidden">
            <HeaderSignOutEverywhere endSessionUrl={endSessionUrl} className={linkClass} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
