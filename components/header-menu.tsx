"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { HeaderLink } from "@/components/header-links";
import { cn } from "@/lib/utils";

/**
 * The section links below the `md` breakpoint. Four links plus the wordmark plus Sign in do not
 * fit at 320px, so the section links move in here and the account control stays in the bar,
 * never behind this menu (witus docs/shared-ui-ux-dx.md, "Sign-in control"). Same shape as
 * witus.online's components/HeaderMenu.tsx: closes on Escape (focus back to the button), on a
 * link tap, and on navigation.
 */
export function HeaderMenu({
  links,
  buttonClass,
  panelClass,
  itemClass,
}: {
  links: HeaderLink[];
  buttonClass: string;
  panelClass: string;
  itemClass: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
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
        <ul className="max-w-5xl mx-auto py-2">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={itemClass} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
