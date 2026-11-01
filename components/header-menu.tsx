"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { APP_LINKS, isCurrentLink, type HeaderLink } from "@/components/header-links";
import { useSignedIn } from "@/components/header-session";
import { cn } from "@/lib/utils";

/**
 * Everything below the `md` breakpoint that does not fit in the bar: the podcast links and, when
 * someone is signed in, the app's destinations. The account control (Sign in, or the app link and
 * Sign out) stays in the bar, never in here (witus docs/shared-ui-ux-dx.md, "Sign-in control").
 * Same shape as witus.online's components/HeaderMenu.tsx: closes on Escape (focus back to the
 * button), on a link tap, and on navigation.
 */
export function HeaderMenu({
  links,
  appNav,
  signedIn: known,
  buttonClass,
  panelClass,
  itemClass,
  headingClass,
}: {
  links: HeaderLink[];
  /** Show the app's destinations to a signed-in visitor. */
  appNav: boolean;
  signedIn?: boolean;
  buttonClass: string;
  panelClass: string;
  itemClass: string;
  headingClass: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const signedIn = useSignedIn(known);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on navigation. Adjusting state during render is React's recommended pattern for this,
  // instead of an effect.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const groups: { heading: string; links: readonly HeaderLink[] }[] = [];
  if (signedIn && appNav) groups.push({ heading: "App", links: APP_LINKS });
  groups.push({ heading: "Podcast", links });

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={buttonClass}
      >
        {open ? "Close" : "Menu"}
      </button>
      <div id={panelId} hidden={!open} className={cn("absolute left-0 right-0 top-full z-40", panelClass)}>
        <div className="max-w-5xl mx-auto py-2">
          {groups.map((g) => (
            <section key={g.heading} aria-label={g.heading}>
              {groups.length > 1 ? (
                <p aria-hidden="true" className={headingClass}>
                  {g.heading}
                </p>
              ) : null}
              <ul>
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      aria-current={isCurrentLink(pathname, l.href) ? "page" : undefined}
                      className={itemClass}
                      onClick={() => setOpen(false)}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
