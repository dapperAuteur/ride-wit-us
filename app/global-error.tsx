"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Last-resort error boundary. Catches errors thrown by the root layout itself, where an
// `error.tsx` would never run because the layout is the thing that broke. It must render
// its own <html>/<body> because the crashed root layout is not there to supply them.
//
// Deliberately dependency-free: no imports from @/components or @/lib (any of which could
// be the thing that is broken) and no Tailwind classes, since globals.css may not have
// loaded. Inline styles only. The one intentional exception is the Sentry SDK, which is
// the entire reason we would ever find out this fired, and it is inert without a DSN.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Reports the root-boundary crash. A no-op when no DSN is configured.
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
          display: "flex",
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: 16,
          textAlign: "center",
          // Matches the layout's themeColor so the fallback does not flash a different
          // background than the rest of the site.
          backgroundColor: "#f4ecd8",
          color: "#1c1917",
        }}
      >
        <main>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ color: "#57534e", fontSize: 14 }}>
            Ride WitUS hit an unexpected error. Reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 12,
              minHeight: 44,
              padding: "0 16px",
              border: "1px solid #a8a29e",
              borderRadius: 6,
              background: "transparent",
              cursor: "pointer",
              font: "inherit",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ marginTop: 16, fontSize: 12, color: "#78716c" }}>
              Error ref: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
