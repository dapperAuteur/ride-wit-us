"use client";

import Link from "next/link";
import { SiteHeader, HEADER_THEMES } from "@/components/site-header";
import { SiteFooter, FOOTER_THEMES } from "@/components/site-footer";

// Route error boundary. Error pages keep the app shell (witus docs/shared-ui-ux-dx.md): the root
// layout has no header, so this renders the header (with Sign in) and the footer. No error text.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <SiteHeader theme={HEADER_THEMES.chalk} />
      <main id="main" className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-start justify-center gap-4 px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-[#221E1B]">Something went wrong</h1>
        <p role="alert" className="text-base text-[#221E1B]">
          This page hit an unexpected error. Reloading usually fixes it.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center rounded border border-[#221E1B] px-4 font-semibold text-[#221E1B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center font-semibold text-[#221E1B] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            Back to home
          </Link>
        </div>
        {error.digest ? <p className="text-xs text-[#221E1B]">Error ref: {error.digest}</p> : null}
      </main>
      <SiteFooter theme={FOOTER_THEMES.chalk} />
    </>
  );
}
