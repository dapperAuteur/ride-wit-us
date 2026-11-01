/**
 * The public header's links and account constants, in a plain module so the server header, the
 * client account control, the phone menu, and the tests all read one list.
 *
 * The sign-in and app hrefs are absolute and never take the styleguide `basePath`: there is one
 * sign-in page and one app, whichever header variant a visitor is looking at.
 */

export interface HeaderLink {
  href: string;
  label: string;
}

/** The secondary (section) links. Inline from `md` up, behind the Menu button below it. */
export function sectionLinks(basePath = ""): HeaderLink[] {
  return [
    { href: `${basePath}/episodes`, label: "Episodes" },
    { href: `${basePath}/episodes#season-1`, label: "Seasons" },
    { href: `${basePath}/tune-in`, label: "Tune in" },
    { href: `${basePath}/about`, label: "About" },
  ];
}

/**
 * The signed-in app's destinations. One list for the public header and the app layout, so a
 * signed-in rider sees the same app links on the podcast pages and inside /app.
 */
export const APP_LINKS: readonly HeaderLink[] = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/trips", label: "Trips" },
  { href: "/app/vehicles", label: "Vehicles" },
  { href: "/app/places", label: "Places" },
  { href: "/app/vendors", label: "Vendors" },
  { href: "/app/settings", label: "Settings" },
];

/** Is `href` the current section? Dashboard matches only itself; the rest match their subpages. */
export function isCurrentLink(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Shared UI rule (witus docs/shared-ui-ux-dx.md, "Sign-in control"): accessible name exactly this. */
export const SIGN_IN_LABEL = "Sign in";
export const SIGN_IN_HREF = "/signin";

export const OPEN_APP_LABEL = "Open the app";
/** The phone-width label for the same link: the full one does not fit beside Sign out at 320px. */
export const OPEN_APP_SHORT_LABEL = "App";
export const APP_HREF = "/app";

/**
 * Answers `{ signedIn: boolean, endSessionUrl: string | null }` from the server's session check
 * (app/api/auth/session). `endSessionUrl` is set only when someone is signed in and this app is a
 * configured WitUS OIDC client: it is what "Sign out of WitUS everywhere" navigates to.
 */
export const SESSION_PROBE_URL = "/api/auth/session";

/** What the header knows about the visitor's session. */
export interface SessionProbe {
  signedIn: boolean;
  /** The IdP's RP-initiated logout URL, or null (signed out, or SSO not configured here). */
  endSessionUrl: string | null;
}

export const SIGNED_OUT: SessionProbe = { signedIn: false, endSessionUrl: null };

/**
 * Read the probe's body. Anything but an explicit `signedIn: true` (an error page, a network
 * failure's null, a changed shape) reads as signed out, so the header falls back to "Sign in".
 */
export function readSessionProbe(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { signedIn?: unknown }).signedIn === true
  );
}

/**
 * Accept an end-session URL only when it is an absolute http(s) URL. The value comes from our own
 * server, but it ends up in `window.location.assign`, so anything else (a `javascript:` URL, a
 * relative path, garbage) reads as "no everywhere control" rather than being followed.
 */
export function safeEndSessionUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? value : null;
  } catch {
    return null;
  }
}

/** Read the whole probe body. Signed out (or unreadable) always means no end-session URL. */
export function readSessionAccount(body: unknown): SessionProbe {
  if (!readSessionProbe(body)) return SIGNED_OUT;
  return { signedIn: true, endSessionUrl: safeEndSessionUrl((body as { endSessionUrl?: unknown }).endSessionUrl) };
}
