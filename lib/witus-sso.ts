/**
 * WitUS SSO — pure helpers.
 *
 * RideWitUS shipped with no authentication of any kind: no login, no session, no database. This
 * file is the first half of the one that was added, ahead of the CentenarianOS travel module
 * moving into this app (BAM, 2026-09-02). "Sign in with WitUS" is the ONLY way in — there is no
 * password, no magic link, and no local user table. Identity comes from the WitUS IdP and is
 * carried in a signed cookie (`lib/auth/session.ts`); nothing about a person is stored here.
 *
 * TWO ECOSYSTEM FEATURES ride on top of that:
 *
 *  1. The SILENT SESSION PROBE behind "Continue as <name>". /signin renders exactly as it would
 *     anyway, and in parallel the browser asks the IdP "who is this?". If an answer arrives, the
 *     button relabels. Nothing waits on it and a failed probe changes nothing on the page.
 *
 *  2. GLOBAL SIGN-OUT. Signing out here also ends the shared session at the IdP, so signing out of
 *     one WitUS app signs you out of all of them (BAM's decision, 2026-08-30). Without it,
 *     "Continue as <name>" would offer to sign you straight back in the moment you signed out.
 *
 * WHY A CORS FETCH AND NOT OIDC `prompt=none`. `prompt=none` is a NAVIGATION — you leave the page
 * to ask it — and the only way to ask without leaving is a hidden iframe, which Safari's ITP blocks.
 * So we ask a dedicated IdP endpoint over CORS while the page is already on screen.
 *
 * THE PROBE ANSWERS ON SOME BROWSERS AND THAT IS FINE. It carries the IdP's cookie as a THIRD-PARTY
 * cookie, so Chrome/Edge answer and Safari ITP / Firefox Total Cookie Protection answer nothing. A
 * probe that answers nothing must render nothing.
 *
 * NOTHING HERE IS A CREDENTIAL. The name arrives across an origin boundary, so it is client-supplied
 * data by definition. It is display copy on a button whose click runs the real OIDC code flow in
 * `app/api/auth/witus/{authorize,callback}`. Nothing in this file may grant access, populate a
 * session, or be sent anywhere.
 *
 * Pure by design: no `next/headers`, no `process.env`, no `window` at module scope, so the client
 * component and the tests both import it directly. The half that reads env lives in
 * `lib/witus-sso-config.ts`.
 */

/**
 * The IdP's OIDC issuer — the better-auth `basePath` on the accounts app, and the SINGLE source
 * every other IdP URL below is derived from.
 *
 * Overridable with `WITUS_OIDC_ISSUER` so a staging or self-hosted IdP moves all five URLs at once
 * and this repo never asserts a second, independently-guessable accounts.witus.online path
 * (authoritative-values rule). The default is not a guess: it is the issuer the already-integrated
 * ecosystem apps send to, confirmed against `claude/lang-chain/wanderlearn-field-reporter`
 * (`src/app/api/auth/witus/*`) and the IdP's own client registry at
 * `gemini/witus/lib/identity/clients.ts`.
 */
export const DEFAULT_WITUS_OIDC_ISSUER = "https://accounts.witus.online/api/idp";

/**
 * This app's OIDC callback path.
 *
 * MUST MATCH THE IdP REGISTRY EXACTLY — redirect URIs are compared with `===`, so a mismatch is a
 * 400 at the IdP, not a fallback. As of 2026-09-02 the registry entry for `ride`
 * (`gemini/witus/lib/identity/clients.ts`) still carries the Better Auth default
 * `/api/auth/oauth2/callback/witus` behind a "confirm RideWitUS's auth lib" TODO. This app does not
 * use Better Auth — it runs the bespoke code flow below — so that entry has to change to this path
 * before sign-in can work. Tracked in `plans/user-tasks/05-witus-sso-env-and-registry.md`.
 */
export const WITUS_CALLBACK_PATH = "/api/auth/witus/callback";

/** Query param marking "this browser already tried the ecosystem flow". */
export const SSO_ATTEMPT_PARAM = "sso";
export const SSO_ATTEMPT_VALUE = "tried";

/**
 * sessionStorage key for the same marker. Written IMMEDIATELY BEFORE we send the browser to the
 * IdP, never after it returns: a marker written on return is a marker that never exists when the
 * return is the thing that failed.
 */
export const SSO_ATTEMPT_STORAGE_KEY = "witus.sso.attempted";

/** How long to wait for the probe before giving up. A silent check that hangs is a broken page. */
export const SILENT_SSO_TIMEOUT_MS = 4000;

/** Longest display name we render. Caps a hostile or absurd value from blowing up the button. */
const MAX_LABEL_LENGTH = 48;

/** The five IdP URLs this app talks to, all derived from one issuer. */
export interface WitusIdpEndpoints {
  authorize: string;
  token: string;
  userinfo: string;
  /** RP-initiated logout — the `end_session_endpoint` the IdP's discovery document advertises. */
  endSession: string;
  /**
   * The ecosystem session probe. On the IdP's ORIGIN, not under the OIDC basePath: it is the
   * accounts app's own route, not a better-auth one.
   *
   * NOT the IdP's better-auth `/get-session`, and it must never be pointed there — that route
   * returns the full `{ session, user }` including the session token, so a credentialed
   * allow-origin on it would let any ecosystem origin (or an XSS on one) lift a live IdP session.
   * `/api/ecosystem/session` answers with a display label and nothing else.
   */
  probe: string;
}

/**
 * Split an issuer into the five endpoints. Returns null for anything that is not an absolute
 * http(s) URL, so a mis-set override turns the features off rather than pointing them somewhere
 * invented.
 */
export function witusIdpEndpoints(
  issuer: string | null | undefined
): WitusIdpEndpoints | null {
  if (!issuer) return null;
  let parsed: URL;
  try {
    parsed = new URL(issuer);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const base = `${parsed.origin}${parsed.pathname.replace(/\/$/, "")}`;
  return {
    authorize: `${base}/oauth2/authorize`,
    token: `${base}/oauth2/token`,
    userinfo: `${base}/oauth2/userinfo`,
    endSession: `${base}/oauth2/endsession`,
    probe: `${parsed.origin}/api/ecosystem/session`,
  };
}

/** Drop a trailing slash so origins concatenate predictably. */
export function normalizeOrigin(siteUrl: string): string {
  return siteUrl.replace(/\/$/, "");
}

/**
 * The OIDC `redirect_uri` this app sends. Shared by the authorize route and its callback so the two
 * can never drift — a mismatch between them is an unrecoverable `invalid_grant`.
 */
export function witusRedirectUri(siteUrl: string): string {
  return `${normalizeOrigin(siteUrl)}${WITUS_CALLBACK_PATH}`;
}

/**
 * The `post_logout_redirect_uri` the IdP sends the visitor back to after a global sign-out.
 *
 * THE TRAILING SLASH IS REQUIRED. better-auth exact-matches this against the client's registered
 * `redirectUrls`, and the IdP registry registers `origin + "/"` for every app. Drop the slash and
 * the IdP answers 400 `invalid_request`.
 *
 * Derived from the SAME `siteUrl` as `witusRedirectUri` deliberately: this app falls back to the
 * request origin when `NEXT_PUBLIC_SITE_URL` is unset, and if sign-in and sign-out resolved that
 * independently they could disagree on a Vercel preview host.
 */
export function witusPostLogoutRedirectUri(siteUrl: string): string {
  return `${normalizeOrigin(siteUrl)}/`;
}

/** Identity shown on the button. Display only, never a credential. */
export interface SsoIdentity {
  /** What "Continue as ___" says — already de-controlled, trimmed, and length-capped. */
  label: string;
}

export type SilentSsoSkip = "not-configured" | "already-attempted" | "already-signed-in";

export type SilentSsoDecision = { attempt: true } | { attempt: false; skip: SilentSsoSkip };

/**
 * Should this browser ask the IdP who it is?
 *
 * `endpoint` is resolved on the SERVER (`lib/witus-sso-config.ts`) and is `null` whenever this app
 * is not a completely configured OIDC client — an affordance the visitor cannot finish is worse
 * than no affordance, so the whole feature stays dark rather than offering a button that dead-ends.
 *
 * RideWitUS is single-tenant and WitUS-branded end to end — one host, one brand, no white-label
 * surface — so there is no tenant host to gate on here the way learnwitus has to. `endpoint` being
 * non-null IS the gate.
 */
export function silentSsoDecision(input: {
  endpoint: string | null | undefined;
  search?: string | null;
  attempted?: boolean;
  signedIn?: boolean;
}): SilentSsoDecision {
  if (!input.endpoint) return { attempt: false, skip: "not-configured" };
  if (input.signedIn) return { attempt: false, skip: "already-signed-in" };
  if (input.attempted || hasAttemptMarker(input.search)) {
    return { attempt: false, skip: "already-attempted" };
  }
  return { attempt: true };
}

/** Does this query string carry the one-shot marker? Accepts "?a=b" or "a=b". */
export function hasAttemptMarker(search: string | null | undefined): boolean {
  if (typeof search !== "string" || search === "") return false;
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get(SSO_ATTEMPT_PARAM) === SSO_ATTEMPT_VALUE;
}

/**
 * Add the one-shot marker to a same-origin path, preserving any query it already has (notably
 * `?error=`, which is how /signin explains what went wrong).
 */
export function withAttemptMarker(path: string): string {
  const [beforeHash, ...hashRest] = path.split("#");
  const hash = hashRest.length > 0 ? `#${hashRest.join("#")}` : "";
  const [pathname, ...queryRest] = beforeHash.split("?");
  const params = new URLSearchParams(queryRest.join("?"));
  params.set(SSO_ATTEMPT_PARAM, SSO_ATTEMPT_VALUE);
  return `${pathname}?${params.toString()}${hash}`;
}

/**
 * Read a display name out of the probe response.
 *
 * Handles `{ signedIn: true, user: { name } }`, a bare user object, and the signed-out answer
 * (`{ signedIn: false }`, which is a 200 rather than an error). Anything else yields null, which
 * renders nothing.
 */
export function parseSilentSsoIdentity(payload: unknown): SsoIdentity | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  if (root.signedIn === false) return null;
  const candidate =
    root.user && typeof root.user === "object" ? (root.user as Record<string, unknown>) : root;
  const label =
    cleanLabel(candidate.name) ?? cleanLabel(candidate.label) ?? cleanLabel(candidate.email);
  return label ? { label } : null;
}

/**
 * Strip C0/C7F control characters by code point rather than with a regex literal, so this file
 * carries no raw control bytes of its own.
 */
function stripControlChars(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x20 && code !== 0x7f) out += ch;
  }
  return out;
}

function cleanLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = stripControlChars(value).trim();
  if (!cleaned) return null;
  return cleaned.length > MAX_LABEL_LENGTH
    ? `${cleaned.slice(0, MAX_LABEL_LENGTH - 1).trimEnd()}…`
    : cleaned;
}

/** Button copy. Kept here so the test pins the exact string the visitor reads. */
export function continueAsLabel(identity: SsoIdentity | null): string {
  return identity ? `Continue as ${identity.label}` : "Sign in with WitUS";
}
