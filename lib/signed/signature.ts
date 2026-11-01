/**
 * The WitUS signed-request format for server-to-server calls between RideWitUS, CentenarianOS and
 * Work.WitUS. Ported from CentenarianOS `lib/events/sign-request.ts` and
 * `lib/events/verify-signature.ts` so both sides agree byte for byte; the shared vectors in
 * `tests/fixtures/witus-signing-vectors.json` (a copy of the CentenarianOS file, which is the source
 * of truth) prove it.
 *
 *   X-Witus-Source:    <source slug>
 *   X-Witus-Timestamp: <unix seconds>
 *   X-Witus-Signature: sha256=<hex(HMAC-SHA256(secret, `${timestamp}.${signed}`))>
 *
 * `signed` is the raw body for a POST, and the path plus query string exactly as sent for a GET
 * (`/api/v1/ride/vendors?witus_sub=...&q=shell`), so the `witus_sub` that picks whose data comes back
 * cannot be edited in flight. The receiver never rebuilds or reorders the query before checking it.
 *
 * Contract: centenarian-os `docs/integrations/ridewitus-contract.md`; wire format:
 * claude/witus-inbox `docs/webhook-contract.md`. Unlike the WitUS Inbox, these receivers require the
 * `sha256=` prefix.
 *
 * Not the Inbox/Outbox senders (lib/sender-inbox.ts, lib/sender-outbox.ts): those are byte-for-byte
 * copies of the receivers' own files and stay untouched.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** Replay window, absolute skew: future timestamps are rejected too. Matches every ecosystem receiver. */
export const MAX_SKEW_SECONDS = 300;

export type VerifyFailure =
  | "no_secret"
  | "missing_headers"
  | "bad_timestamp"
  | "stale_timestamp"
  | "bad_signature_format"
  | "signature_mismatch";

export type VerifyResult = { ok: true; source: string } | { ok: false; reason: VerifyFailure };

export interface SignedHeaders {
  "Content-Type": "application/json";
  "X-Witus-Source": string;
  "X-Witus-Timestamp": string;
  "X-Witus-Signature": string;
}

/** hex(HMAC-SHA256(secret, `${timestamp}.${signed}`)), over UTF-8 bytes. */
export function witusSignature(secret: string, timestamp: string | number, signed: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${signed}`).digest("hex");
}

/** The three X-Witus-* headers (plus Content-Type) for `signed`. */
export function signedHeaders(args: { secret: string; source: string; signed: string; nowSeconds?: number }): SignedHeaders {
  const timestamp = String(Math.floor(args.nowSeconds ?? Date.now() / 1000));
  return {
    "Content-Type": "application/json",
    "X-Witus-Source": args.source,
    "X-Witus-Timestamp": timestamp,
    "X-Witus-Signature": `sha256=${witusSignature(args.secret, timestamp, args.signed)}`,
  };
}

/** What a GET signs: its path and query string, exactly as sent. */
export function signedGetBody(url: URL | { pathname: string; search: string }): string {
  return `${url.pathname}${url.search}`;
}

export interface VerifyArgs {
  /** The raw body EXACTLY as received for a POST, or signedGetBody(url) for a GET. */
  signed: string;
  signatureHeader: string | null;
  timestampHeader: string | null;
  sourceHeader: string | null;
  secret: string | undefined | null;
  /** Defaults to now; injectable so tests can pin the clock. */
  nowSeconds?: number;
}

/** Checks the signature and the replay window. The caller checks the source slug. */
export function verifyWitusSignature(args: VerifyArgs): VerifyResult {
  const { signed, signatureHeader, timestampHeader, sourceHeader, secret } = args;

  // A missing secret is a misconfiguration, not an attack: kept apart so logs can tell them apart.
  if (!secret) return { ok: false, reason: "no_secret" };
  if (!signatureHeader || !timestampHeader || !sourceHeader) return { ok: false, reason: "missing_headers" };

  // parseInt matches the CentenarianOS verifier exactly (the shared vectors pin it).
  const ts = Number.parseInt(timestampHeader, 10);
  if (!Number.isFinite(ts)) return { ok: false, reason: "bad_timestamp" };

  const now = args.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > MAX_SKEW_SECONDS) return { ok: false, reason: "stale_timestamp" };

  const prefix = "sha256=";
  if (!signatureHeader.startsWith(prefix)) return { ok: false, reason: "bad_signature_format" };
  const provided = signatureHeader.slice(prefix.length);
  const expected = witusSignature(secret, ts, signed);

  // timingSafeEqual throws on a length mismatch, so length is checked first.
  if (provided.length !== expected.length) return { ok: false, reason: "signature_mismatch" };
  if (!timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"))) {
    return { ok: false, reason: "signature_mismatch" };
  }
  return { ok: true, source: sourceHeader };
}
