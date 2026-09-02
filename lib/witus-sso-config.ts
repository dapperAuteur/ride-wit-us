/**
 * Server-side resolution of everything WitUS SSO needs out of the environment. The pure helpers
 * these are built from live in `lib/witus-sso.ts`; this file is the half that touches env and
 * request headers.
 *
 * WHY IT IS SEPARATE. Two of the consumers are Client Components — the sign-in button and the
 * sign-out button — and a Client Component must never be handed the raw env. The server resolves
 * the finished URL and passes it down as a prop, or passes `null` and the feature stays dark.
 *
 * (No `import "server-only"`: that package is not a dependency of this repo and adding one to buy
 * a lint-time guarantee is not worth a new install. The rule is enforced by review and by the fact
 * that every export here is called from a Server Component or Route Handler.)
 */
import { headers } from "next/headers";
import {
  DEFAULT_WITUS_OIDC_ISSUER,
  witusIdpEndpoints,
  witusPostLogoutRedirectUri,
  type WitusIdpEndpoints,
} from "@/lib/witus-sso";

/** True only when the named env var is set to a non-empty string. Never returns the value. */
function isSet(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0;
}

/**
 * Is this deploy a usable WitUS OIDC client?
 *
 * ALL THREE, not just the client id. The spec gates the ecosystem features on
 * `WITUS_OIDC_CLIENT_ID`, but this app has no second way in: without the client secret the token
 * exchange fails, and without the session secret the callback cannot mint a session, so in either
 * case the button is an affordance the visitor cannot complete. Checking all three keeps a
 * half-provisioned deploy showing no sign-in at all rather than a sign-in that dead-ends.
 *
 * Deliberately NOT thrown at module scope. Every public page here is statically prerendered, so a
 * module-scope throw would break `next build` on a deploy that has simply not been provisioned yet
 * — which is the supported state for this app, exactly as it is for Mailgun and Sentry.
 */
export function witusSsoConfigured(): boolean {
  return (
    isSet("WITUS_OIDC_CLIENT_ID") &&
    isSet("WITUS_OIDC_CLIENT_SECRET") &&
    isSet("WITUS_SESSION_SECRET")
  );
}

/** The configured IdP issuer — the one source every IdP URL is derived from. */
export function witusIssuer(): string {
  return process.env.WITUS_OIDC_ISSUER || DEFAULT_WITUS_OIDC_ISSUER;
}

/** The five IdP URLs, or null when the configured issuer is unusable. */
export function witusEndpoints(): WitusIdpEndpoints | null {
  return witusIdpEndpoints(witusIssuer());
}

/**
 * This app's canonical public origin, used to build BOTH the OIDC `redirect_uri` and the
 * `post_logout_redirect_uri`. Sharing one source is the point: the IdP exact-matches both against
 * this client's registered URLs, so if sign-in and sign-out derived the origin differently, one of
 * them would 400 on any host where they disagreed.
 *
 * `NEXT_PUBLIC_SITE_URL` when set, otherwise the request's own origin.
 *
 * DELIBERATELY NOT `lib/site-meta.ts`'s `SITE_URL`. That constant says
 * `https://ridewitus.witus.online`, which does not resolve — verified 2026-09-02, DNS returns
 * nothing while `https://ride.witus.online` serves the site with a 200, and `ride.witus.online` is
 * what the IdP registry has registered for this client. Building a redirect_uri from a host that
 * does not exist would fail sign-in closed for a reason nobody would think to look for. (The
 * `SITE_URL` value itself is a pre-existing bug affecting `metadataBase` and the OG tags; fixing it
 * is a separate concern and a separate branch, not this one.)
 */
export async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Where /signin's silent "Continue as …" check asks the IdP who this browser is, or `null` when
 * this app is not a configured OIDC client.
 *
 * Dark without configuration for the same reason the button is: there is no sign-in to offer, so
 * there is no question worth asking — and asking anyway would put a request to
 * accounts.witus.online on behalf of an app that cannot complete the flow.
 */
export function witusSilentSsoEndpoint(): string | null {
  if (!witusSsoConfigured()) return null;
  return witusEndpoints()?.probe ?? null;
}

/**
 * The full RP-initiated logout URL for global sign-out, or `null` when this app is not a configured
 * OIDC client (in which case sign-out stays purely local).
 *
 * `client_id` IS REQUIRED, not optional: better-auth's endSession endpoint rejects a
 * `post_logout_redirect_uri` with `invalid_request` unless the request carries either a verifiable
 * `id_token_hint` or an explicit `client_id`, and this app holds no id_token client-side — the
 * callback reads claims from userinfo server-to-server and throws the tokens away.
 *
 * ORIGIN CAVEAT. `post_logout_redirect_uri` must EXACTLY equal what the IdP registry holds for this
 * client, which is that client's registered origin plus a trailing slash. If the registered origin
 * is wrong, this fails closed (a 400 from the IdP), which is the safe direction but does mean
 * sign-out lands on the IdP's own page instead of coming back here. The visitor is still signed out
 * locally either way — see `components/sign-out-button.tsx` for why the ordering guarantees that.
 */
export async function witusEndSessionUrl(): Promise<string | null> {
  if (!witusSsoConfigured()) return null;
  const endpoints = witusEndpoints();
  if (!endpoints) return null;
  const clientId = process.env.WITUS_OIDC_CLIENT_ID as string;
  const back = witusPostLogoutRedirectUri(await siteOrigin());
  return (
    `${endpoints.endSession}?client_id=${encodeURIComponent(clientId)}` +
    `&post_logout_redirect_uri=${encodeURIComponent(back)}`
  );
}
