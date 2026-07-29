import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

// Server-runtime Sentry init, loaded from instrumentation.ts's register() on the Node runtime.
// Errors are ingested by Better Stack, which speaks the Sentry protocol. The DSN it issues is the
// only thing that points this at Better Stack rather than sentry.io, so nothing here is vendor-specific.
//
// GUARDED ON THE DSN: with no SENTRY_DSN set, init is skipped entirely and the SDK is inert, so the
// app builds, deploys, and runs exactly as before until BAM provisions the source and sets the var
// (see plans/user-tasks/02-betterstack-sentry-dsn.md).
const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    // Errors only for now: no performance/tracing spend until BAM opts in.
    tracesSampleRate: 0,
    // Never auto-attach IP / cookies / form bodies; the beforeSend scrub is the second line of defense.
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  });
}
