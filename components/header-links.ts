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

/** Shared UI rule (witus docs/shared-ui-ux-dx.md, "Sign-in control"): accessible name exactly this. */
export const SIGN_IN_LABEL = "Sign in";
export const SIGN_IN_HREF = "/signin";

export const OPEN_APP_LABEL = "Open the app";
/** The phone-width label for the same link: the full one does not fit beside Sign out at 320px. */
export const OPEN_APP_SHORT_LABEL = "App";
export const APP_HREF = "/app";

/** Answers `{ signedIn: boolean }` from the server's session check (app/api/auth/session). */
export const SESSION_PROBE_URL = "/api/auth/session";

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
