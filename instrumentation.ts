import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";

// Next.js instrumentation hook. Loads the right Sentry config per runtime. Everything below is
// inert without SENTRY_DSN (the guard lives in the configs themselves).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config");
}

// Captures errors thrown while rendering or serving a request. Nearly every page here is statically
// prerendered, so in practice this is the net under /api/inbox-ingest and /api/outbox/publish, the
// two routes that can fail at runtime. The scrubber drops the submitted body before transmission.
export const onRequestError: Instrumentation.onRequestError = Sentry.captureRequestError;
