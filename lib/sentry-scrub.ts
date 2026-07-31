import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Sentry `beforeSend` scrubber for RideWitUS.
 *
 * Why this file exists
 * --------------------
 * This app has no database and no auth, but it is NOT PII-free. Three things flow through it that
 * must never leave for a third-party error tracker:
 *
 *   1. **Form submissions** (`/api/inbox-ingest`): `class_notify_signup` carries a subscriber's
 *      email and name; `general_contact` carries a name, email, and free-text message;
 *      `host_listen_party` carries an org, a free-form contact string, and a **neighborhood**, which
 *      is a location for a real person or a real building. A crash inside that handler would
 *      otherwise attach the whole request body to the event.
 *   2. **HMAC credentials**: every outbound Inbox/Outbox call is signed and the signature travels in
 *      an `X-Witus-Signature` header (see `lib/witus-sender.ts`). Those secrets are shared with
 *      sibling apps, so leaking one is an ecosystem-wide problem, not a RideWitUS one.
 *   3. **Location detail generally**: RideWitUS is the ride/transport surface of WitUS. Anything
 *      shaped like a street address, a neighborhood, or a lat/lng pair is treated as sensitive even
 *      when it arrives through a field we did not anticipate.
 *
 * The bias is deliberate: REDACT WHEN UNSURE. An over-redacted crash report costs a few minutes of
 * triage; an under-redacted one hands a stranger a subscriber's email or a working signing key.
 * `scrubEvent` never returns `null`: we still want the crash signal, just without the payload.
 *
 * Pure and dependency-free (no `server-only`, no repo imports) so it is directly unit-testable.
 * See `lib/sentry-scrub.test.ts`.
 */

/** Query-param names that carry (or plausibly carry) a bearer secret. Substring, case-insensitive. */
const SECRET_PARAM_RE =
  /(token|secret|code|otp|passcode|password|pwd|pin|key|jwt|sig|signature|hmac|hash|auth|credential|session|magic|invite|nonce|email)/i;

/** Path prefixes that redeem or carry a credential by construction. */
const SECRET_PATH_RE = /^\/(api\/auth|auth|join|invite|accept|reset|confirm|activate|unsubscribe)(\/|$)/i;

/** A path segment shaped like a generated token: long and drawn from hex / base64url / nanoid. */
const TOKENISH_SEGMENT_RE = /^[A-Za-z0-9_-]{24,}$/;

/** Absolute http(s) URLs, minus any trailing sentence punctuation. */
const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;

/** Email addresses anywhere in free text (form payloads, Mailgun API errors, reply-to strings). */
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

/** JSON Web Tokens (three base64url segments). */
const JWT_RE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;

/** `sha256=<hex>` HMAC signatures, the exact shape `lib/witus-sender.ts` emits. */
const HMAC_RE = /\bsha(?:1|256|512)=[A-Fa-f0-9]{16,}\b/g;

/** `Authorization: Bearer <token>` echoed into an error string. No separator, so it needs its own rule. */
const BEARER_RE = /\bBearer\s+[A-Za-z0-9._~+/-]{8,}={0,2}/gi;

/**
 * A labelled raw secret: `secret: hunter2`, `API key = abc123`, `signature — deadbeef`. The
 * separator is REQUIRED so ordinary prose ("the key insight") survives untouched. The label is
 * allowed to carry surrounding word characters because the shapes that actually appear in this
 * app's errors are env-var names (`INBOX_INGEST_SECRET`, `OUTBOX_PODCAST_RWU_SECRET`,
 * `MAILGUN_API_KEY`) and a plain `\b` would never match the underscore-prefixed form.
 */
const SECRET_LABEL_RE =
  /([\w.-]*(?:password|passcode|secret|api[\s_-]?key|access[\s_-]?key|signing[\s_-]?key|token|signature|hmac|one[-\s]?time code|verification code)[\w.-]*)\s*(?:is|:|=|—)\s*([^\s.,;"']{3,})/gi;

/**
 * A labelled coordinate or street address: `lat: 39.7684`, `lng=-86.1581`, `address: 123 Main St`.
 * Rider/rider-adjacent location is treated as sensitive per the note at the top of this file.
 */
const COORD_LABEL_RE = /\b(lat|latitude|lng|lon|long|longitude|coord|coords|coordinates)\b\s*(?::|=|is)\s*-?\d+(?:\.\d+)?/gi;
const STREET_ADDRESS_RE = /\b\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,3}\s+(?:st|street|ave|avenue|rd|road|blvd|boulevard|ln|lane|dr|drive|ct|court|way|pkwy|parkway|ter|terrace|pl|place)\b\.?/gi;

/**
 * Object keys whose VALUE is dropped wholesale wherever we walk a structured bag (`extra`, `tags`,
 * `contexts`, breadcrumb data). Covers this app's real field names (`neighborhood`, `contact`,
 * `notes`, `message` from the three form payloads) plus the usual credential names.
 */
const SENSITIVE_KEY_RE =
  /(email|e-?mail|phone|tel|mobile|address|street|zip|postal|city|neighbou?rhood|location|geo|lat|lng|lon|latitude|longitude|coord|contact|full[_-]?name|first[_-]?name|last[_-]?name|username|token|secret|signature|hmac|password|passcode|api[_-]?key|authorization|cookie|session|otp|pin|message|notes|body|payload)/i;

/** Request headers that carry a credential or a network identity. Lowercase keys. */
const SENSITIVE_HEADERS = [
  "authorization",
  "cookie",
  "set-cookie",
  "proxy-authorization",
  "x-witus-signature",
  "x-witus-source",
  "x-forwarded-for",
  "x-real-ip",
  "x-vercel-forwarded-for",
  "x-vercel-ip-city",
  "x-vercel-ip-latitude",
  "x-vercel-ip-longitude",
  "true-client-ip",
  "cf-connecting-ip",
];

export const REDACTED = "[redacted]";
export const REDACTED_LINK = "[redacted link]";

/**
 * Is this URL carrying a secret? Unparseable input returns `true`, precisely because that is the case where
 * we cannot reason about the string, and the rule is redact when unsure.
 */
export function isSensitiveUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return true;
  }
  for (const key of url.searchParams.keys()) {
    if (SECRET_PARAM_RE.test(key)) return true;
  }
  if (SECRET_PATH_RE.test(url.pathname)) return true;
  return url.pathname.split("/").some((seg) => TOKENISH_SEGMENT_RE.test(seg));
}

/**
 * Remove every credential and every piece of personal or location data from a string, while keeping
 * enough shape that the message still reads as the error it was. Safe to run repeatedly.
 */
export function redactText(input: string): string {
  let out = input.replace(URL_RE, (match) => (isSensitiveUrl(match) ? REDACTED_LINK : match));
  out = out.replace(JWT_RE, REDACTED);
  out = out.replace(HMAC_RE, REDACTED);
  out = out.replace(BEARER_RE, `Bearer ${REDACTED}`);
  out = out.replace(EMAIL_RE, REDACTED);
  out = out.replace(STREET_ADDRESS_RE, REDACTED);
  out = out.replace(COORD_LABEL_RE, (_m, label: string) => `${label}: ${REDACTED}`);
  out = out.replace(SECRET_LABEL_RE, (_m, label: string, value: string) =>
    value.startsWith("[redacted") ? `${label}: ${value}` : `${label}: ${REDACTED}`
  );
  return out;
}

const scrub = (s: string | undefined): string | undefined => (typeof s === "string" ? redactText(s) : s);

/**
 * Walk a structured bag (Sentry `extra`, `contexts`, breadcrumb `data`) redacting strings and
 * dropping any value whose KEY names something sensitive. Depth-limited so a cyclic or pathological
 * object can never stall the error path.
 */
function scrubBag(value: unknown, depth = 0): unknown {
  if (depth > 4) return REDACTED;
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map((v) => scrubBag(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_RE.test(key) ? REDACTED : scrubBag(v, depth + 1);
    }
    return out;
  }
  return value;
}

/**
 * Sentry `beforeSend`. Strips identity, credentials, request bodies, and location detail from an
 * event before it is transmitted, and always returns the event so the crash is still reported.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.message) event.message = scrub(event.message);
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = scrub(ex.value);
  }

  // Never ship the account identity or the network origin.
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
    delete event.user.username;
  }

  if (event.request) {
    if (typeof event.request.url === "string") event.request.url = scrub(event.request.url);
    if (typeof event.request.query_string === "string") {
      event.request.query_string = scrub(event.request.query_string);
    }
    delete event.request.cookies;
    // The form bodies this app accepts are, by definition, someone's contact details and location.
    // There is no triage value in the body that is worth transmitting it, so it goes entirely.
    delete event.request.data;
    const headers = event.request.headers as Record<string, string> | undefined;
    if (headers) {
      for (const name of Object.keys(headers)) {
        if (SENSITIVE_HEADERS.includes(name.toLowerCase())) delete headers[name];
      }
    }
  }

  if (event.extra) event.extra = scrubBag(event.extra) as typeof event.extra;
  if (event.contexts) event.contexts = scrubBag(event.contexts) as typeof event.contexts;

  if (event.tags) {
    for (const [key, value] of Object.entries(event.tags)) {
      if (SENSITIVE_KEY_RE.test(key)) event.tags[key] = REDACTED;
      else if (typeof value === "string") event.tags[key] = redactText(value);
    }
  }

  // Breadcrumbs are the sleeper leak: an outbound fetch to the Inbox lands here URL-and-all.
  for (const crumb of event.breadcrumbs ?? []) {
    if (crumb.message) crumb.message = redactText(crumb.message);
    if (crumb.data) crumb.data = scrubBag(crumb.data) as typeof crumb.data;
  }

  return event;
}
