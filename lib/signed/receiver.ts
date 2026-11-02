/**
 * The receiving half of signed server-to-server requests: what every RideWitUS endpoint that
 * CentenarianOS or Work.WitUS calls runs first.
 *
 *   1. One secret per endpoint (RECEIVERS below), so each can be rotated or revoked alone.
 *      Unset = 503 not_configured, never a silent accept.
 *   2. The signature over the raw body (POST) or the path plus query exactly as sent (GET),
 *      inside the 300-second window (lib/signed/signature.ts).
 *   3. The source slug: each endpoint accepts exactly one sender.
 *
 * Every 401 answers the same flat message; the precise reason is for logs only, so the response is
 * not an oracle. Contract: centenarian-os docs/integrations/ridewitus-contract.md (§1, §2).
 */
import { signedGetBody, verifyWitusSignature, type VerifyFailure } from "./signature";

/** Source slugs from gemini/witus/lib/products.ts (checked 2026-10-31). */
export const SOURCE = {
  rideWitus: "ride-witus",
  centenarianos: "centenarianos",
  workWitus: "work-witus",
} as const;

export type SourceSlug = (typeof SOURCE)[keyof typeof SOURCE];

export interface ReceiverSpec {
  /** Env var holding this endpoint's shared secret (the same value on the sending app). */
  secretEnv: string;
  /** The one sender this endpoint accepts. */
  source: SourceSlug;
}

/**
 * Every signed endpoint RideWitUS serves, with its secret and sender (contract table E5 to E7, E10).
 * E5 to E7 are served by app/api/events/* (plan 70 R-3, lib/events/inbound.ts); E10 arrives with R-7.
 */
export const RECEIVERS = {
  envelopeBalance: { secretEnv: "ENVELOPE_BALANCE_EVENTS_SECRET", source: SOURCE.centenarianos },
  calendarActivity: { secretEnv: "CALENDAR_ACTIVITY_EVENTS_SECRET", source: SOURCE.centenarianos },
  financeMatch: { secretEnv: "FINANCE_MATCH_EVENTS_SECRET", source: SOURCE.centenarianos },
  workJobTravel: { secretEnv: "WORK_JOB_TRAVEL_API_SECRET", source: SOURCE.workWitus },
} as const satisfies Record<string, ReceiverSpec>;

export type ReceiverName = keyof typeof RECEIVERS;

export type ReceiveFailure = VerifyFailure | "wrong_source";

export type ReceiveResult = { ok: true; source: string } | { ok: false; reason: ReceiveFailure; status: 401 | 503 };

export interface HeaderReader {
  get(name: string): string | null;
}

/** Signature, window, then the expected source. No I/O. */
export function verifySignedRequest(args: {
  signed: string;
  headers: HeaderReader;
  secret: string | undefined | null;
  expectedSource: string;
  nowSeconds?: number;
}): ReceiveResult {
  const verdict = verifyWitusSignature({
    signed: args.signed,
    signatureHeader: args.headers.get("x-witus-signature"),
    timestampHeader: args.headers.get("x-witus-timestamp"),
    sourceHeader: args.headers.get("x-witus-source"),
    secret: args.secret,
    nowSeconds: args.nowSeconds,
  });
  if (!verdict.ok) return { ok: false, reason: verdict.reason, status: verdict.reason === "no_secret" ? 503 : 401 };
  if (verdict.source !== args.expectedSource) return { ok: false, reason: "wrong_source", status: 401 };
  return { ok: true, source: verdict.source };
}

/**
 * What a request signs. A GET signs its path and query exactly as received; anything else signs
 * its raw body, read here as text BEFORE any JSON parsing (re-serialized JSON would not match).
 * Returns the body text too, so the route parses the same bytes it verified.
 */
export async function readSignedPayload(request: Request): Promise<{ signed: string; body: string | null }> {
  if (request.method === "GET" || request.method === "HEAD") {
    return { signed: signedGetBody(new URL(request.url)), body: null };
  }
  const body = await request.text();
  return { signed: body, body };
}

/** The ecosystem response envelope. */
export type Envelope<T> = { ok: true; data: T } | { ok: false; error: string; code: string };

export function okEnvelope<T>(data: T): Envelope<T> {
  return { ok: true, data };
}

export function errorEnvelope(code: string, error: string): Envelope<never> {
  return { ok: false, error, code };
}

/**
 * Verify a request to the named endpoint. On failure returns the status and envelope to answer
 * with, and logs the reason (never the body, secret or signature).
 */
export async function receiveSigned(
  request: Request,
  name: ReceiverName,
  options: { env?: Record<string, string | undefined>; nowSeconds?: number } = {}
): Promise<
  | { ok: true; source: string; body: string | null }
  | { ok: false; status: 401 | 503; envelope: Envelope<never>; reason: ReceiveFailure }
> {
  const spec: ReceiverSpec = RECEIVERS[name];
  const env = options.env ?? process.env;
  const { signed, body } = await readSignedPayload(request);
  const result = verifySignedRequest({
    signed,
    headers: request.headers,
    secret: env[spec.secretEnv],
    expectedSource: spec.source,
    nowSeconds: options.nowSeconds,
  });
  if (result.ok) return { ok: true, source: result.source, body };
  console.warn("[signed] %s rejected reason=%s", name, result.reason);
  return result.status === 503
    ? { ok: false, status: 503, reason: result.reason, envelope: errorEnvelope("not_configured", "Not configured") }
    : { ok: false, status: 401, reason: result.reason, envelope: errorEnvelope("unauthorized", "Unauthorized") };
}
