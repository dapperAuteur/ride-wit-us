"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_LINKS, isCurrentLink } from "@/components/header-links";
import { useSignedIn } from "@/components/header-session";

/**
 * The header's second row when someone is signed in: the app's destinations, inline from `md` up
 * (below `md` they are in the Menu). The same row on the podcast pages and inside /app, so a
 * signed-in rider can move between the two without hunting.
 *
 * On a statically prerendered public page the row appears once the session probe answers.
 */
export function HeaderAppNav({
  signedIn: known,
  linkClass,
  currentClass,
}: {
  signedIn?: boolean;
  linkClass: string;
  currentClass: string;
}) {
  const signedIn = useSignedIn(known);
  const pathname = usePathname();
  if (!signedIn) return null;

  return (
    <nav aria-label="App" className="hidden md:block">
      <ul className="max-w-5xl mx-auto px-6 pb-2 flex flex-wrap items-center gap-1 text-sm">
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
  );
}
