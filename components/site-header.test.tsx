/**
 * The public header's account control (shared UI rule, witus docs/shared-ui-ux-dx.md, "Sign-in
 * control"): signed out it shows a link named exactly "Sign in" to /signin; signed in it shows
 * "Open the app" and "Sign out". BAM could not find where to log in on 2026-10-31 because the
 * header had neither; these fail if either branch goes missing again.
 *
 * No DOM test setup in this repo (vitest in node), so this renders to static HTML, which is also
 * what a statically prerendered page ships before the session probe runs.
 */
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HeaderAccount } from "@/components/header-account";
import {
  APP_LINKS,
  isCurrentLink,
  readSessionAccount,
  readSessionProbe,
  safeEndSessionUrl,
  sectionLinks,
} from "@/components/header-links";
import { HEADER_THEMES, SiteHeader } from "@/components/site-header";

const SIGN_IN_LINK = /<a [^>]*href="\/signin"[^>]*>Sign in<\/a>/;

/** The anchor's classes, so a test can check it is not hidden at some width. */
function classesOf(html: string, pattern: RegExp): string {
  const tag = html.match(pattern)?.[0] ?? "";
  return tag.match(/class="([^"]*)"/)?.[1] ?? "";
}

describe("SiteHeader signed out (and while the session is still loading)", () => {
  it("shows a link named exactly \"Sign in\" to /signin", () => {
    const html = renderToStaticMarkup(<SiteHeader />);
    expect(html).toMatch(SIGN_IN_LINK);
    expect(html).not.toContain("Sign out");
  });

  it("never hides Sign in at any width", () => {
    const html = renderToStaticMarkup(<SiteHeader />);
    const classes = classesOf(html, /<a [^>]*href="\/signin"[^>]*>/).split(/\s+/);
    expect(classes).not.toContain("hidden");
    expect(classes.some((c) => /^(sm|md|lg|xl):hidden$/.test(c))).toBe(false);
    expect(classes).toContain("min-h-11");
  });

  it("keeps /signin unprefixed in every styleguide variant", () => {
    for (const [name, theme] of Object.entries(HEADER_THEMES)) {
      const html = renderToStaticMarkup(<SiteHeader theme={theme} basePath="/styleguide/workshop-apron" />);
      expect(html, name).toMatch(SIGN_IN_LINK);
      expect(html, name).not.toContain('href="/styleguide/workshop-apron/signin"');
    }
  });

  it("still links every section, inline from md up and in the phone menu", () => {
    const html = renderToStaticMarkup(<SiteHeader />);
    for (const { href, label } of sectionLinks()) {
      const anchors = html.match(new RegExp(`<a [^>]*href="${href}"[^>]*>${label}</a>`, "g")) ?? [];
      expect(anchors.length, label).toBe(2);
    }
    expect(html).toMatch(/<button type="button" aria-expanded="false"[^>]*>Menu<\/button>/);
  });
});

describe("SiteHeader signed in", () => {
  it("shows Open the app and the local Sign out, and no Sign in", () => {
    const html = renderToStaticMarkup(<SiteHeader signedIn />);
    expect(html).not.toMatch(SIGN_IN_LINK);
    expect(html).toMatch(/<a [^>]*href="\/app"[^>]*>[\s\S]*?Open the app[\s\S]*?<\/a>/);
    const form = html.match(/<form[^>]*>[\s\S]*?<\/form>/)?.[0] ?? "";
    expect(form).toMatch(/action="\/api\/auth\/signout"/);
    expect(form).toMatch(/method="post"/);
    expect(form).toMatch(/<button type="submit"[^>]*>Sign out<\/button>/);
  });

  it("is the same control the probe flips to", () => {
    const html = renderToStaticMarkup(<HeaderAccount linkClass="x" signedIn />);
    expect(html).toContain('href="/app"');
    expect(html).toContain(">Sign out</button>");
  });
});

describe("the app's destinations in the header", () => {
  it("lists every app link to a signed-in visitor, in the App row and in the phone menu", () => {
    const html = renderToStaticMarkup(<SiteHeader signedIn />);
    expect(html).toMatch(/<nav aria-label="App"/);
    for (const { href, label } of APP_LINKS) {
      const anchors = html.match(new RegExp(`<a [^>]*href="${href}"[^>]*>${label}</a>`, "g")) ?? [];
      expect(anchors.length, label).toBe(2);
    }
    // The podcast links stay reachable alongside them.
    for (const { href } of sectionLinks()) expect(html).toContain(`href="${href}"`);
  });

  it("shows no app links to a signed-out visitor", () => {
    const html = renderToStaticMarkup(<SiteHeader />);
    expect(html).not.toMatch(/<nav aria-label="App"/);
    for (const { href } of APP_LINKS.filter((l) => l.href !== "/app")) expect(html).not.toContain(`href="${href}"`);
  });

  it("leaves the app links out when the app turns them off, but keeps the account control", () => {
    const html = renderToStaticMarkup(<SiteHeader signedIn appNav={false} />);
    expect(html).not.toContain('href="/app/trips"');
    expect(html).toContain(">Sign out</button>");
  });

  it("marks the current section", () => {
    expect(isCurrentLink("/app", "/app")).toBe(true);
    expect(isCurrentLink("/app/trips", "/app")).toBe(false);
    expect(isCurrentLink("/app/trips/abc", "/app/trips")).toBe(true);
    expect(isCurrentLink("/app/tripsx", "/app/trips")).toBe(false);
    expect(isCurrentLink(null, "/app")).toBe(false);
  });
});

describe("the app layout uses the same header", () => {
  const source = readFileSync(new URL("../app/app/layout.tsx", import.meta.url), "utf8");

  it("renders SiteHeader signed in, with the app row only when the app can serve the rider", () => {
    expect(source).toMatch(/<SiteHeader[^>]*\bsignedIn\b/);
    expect(source).toMatch(/appNav=\{ctx\.state === "ok"\}/);
  });

  it("keeps \"Sign out of WitUS everywhere\" reachable inside the app", () => {
    expect(source).toContain("<SignOutEverywhereButton");
  });
});

describe("readSessionProbe", () => {
  it("reads only an explicit signedIn: true as signed in", () => {
    expect(readSessionProbe({ signedIn: true })).toBe(true);
    for (const body of [{ signedIn: false }, { signedIn: "true" }, {}, null, undefined, "ok", 1]) {
      expect(readSessionProbe(body)).toBe(false);
    }
  });
});

const END_SESSION =
  "https://accounts.witus.online/api/idp/oauth2/endsession?client_id=witus-ride" +
  "&post_logout_redirect_uri=https%3A%2F%2Fride.witus.online%2F";
const EVERYWHERE = /<button type="button"[^>]*>Sign out of WitUS everywhere<\/button>/g;

describe("\"Sign out of WitUS everywhere\" beside Sign out in the header (BAM, 2026-11-01)", () => {
  it("renders in the bar from lg up, the second row from md to lg, and the Menu's Account group", () => {
    const html = renderToStaticMarkup(<SiteHeader signedIn endSessionUrl={END_SESSION} />);
    const buttons = html.match(EVERYWHERE) ?? [];
    expect(buttons).toHaveLength(3);
    // Bar: hidden below lg, shown from lg.
    const bar = buttons.find((b) => /\blg:inline-flex\b/.test(b));
    expect(bar).toBeTruthy();
    expect(bar).toMatch(/\bhidden\b/);
    // Menu: an Account group with the local Sign out form next to the everywhere control.
    const account = html.match(/<section aria-label="Account">[\s\S]*?<\/section>/)?.[0] ?? "";
    expect(account).toMatch(/<form action="\/api\/auth\/signout" method="post">/);
    expect(account).toMatch(/<button type="submit"[^>]*>Sign out<\/button>/);
    expect(account).toMatch(EVERYWHERE);
    expect(account).toContain("Also signs you out of WitUS.");
  });

  it("describes every copy with the help text", () => {
    const html = renderToStaticMarkup(<SiteHeader signedIn endSessionUrl={END_SESSION} />);
    for (const button of html.match(EVERYWHERE) ?? []) {
      const id = button.match(/aria-describedby="([^"]+)"/)?.[1];
      expect(id).toBeTruthy();
      expect(html).toMatch(new RegExp(`<span id="${id}"[^>]*>Also signs you out of WitUS\\.`));
    }
  });

  it("keeps the bar's Sign out a plain local form, never the IdP URL", () => {
    const html = renderToStaticMarkup(<SiteHeader signedIn endSessionUrl={END_SESSION} />);
    const form = html.match(/<form[^>]*>[\s\S]*?<\/form>/)?.[0] ?? "";
    expect(form).toMatch(/action="\/api\/auth\/signout"/);
    expect(form).not.toContain("endsession");
  });

  it("does not render when SSO is not configured (null) or nobody is signed in", () => {
    expect(renderToStaticMarkup(<SiteHeader signedIn endSessionUrl={null} />)).not.toContain("WitUS everywhere");
    expect(renderToStaticMarkup(<SiteHeader signedIn endSessionUrl={null} />)).not.toContain('aria-label="Account"');
    expect(renderToStaticMarkup(<SiteHeader />)).not.toContain("WitUS everywhere");
    expect(renderToStaticMarkup(<SiteHeader signedIn={false} endSessionUrl={END_SESSION} />)).not.toContain(
      "WitUS everywhere"
    );
  });

  it("stays reachable for a rider the app cannot serve yet (no app links)", () => {
    const html = renderToStaticMarkup(<SiteHeader signedIn appNav={false} endSessionUrl={END_SESSION} />);
    expect(html).not.toContain('href="/app/trips"');
    expect((html.match(EVERYWHERE) ?? []).length).toBe(3);
  });

  it("is passed to the header by the app layout and /signed-in", () => {
    for (const file of ["../app/app/layout.tsx", "../app/signed-in/page.tsx"]) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(source, file).toMatch(/<SiteHeader[\s\S]*?endSessionUrl=\{endSessionUrl\}/);
    }
  });
});

describe("readSessionAccount", () => {
  it("returns the end-session URL only for a signed-in visitor with an http(s) URL", () => {
    expect(readSessionAccount({ signedIn: true, endSessionUrl: END_SESSION })).toEqual({
      signedIn: true,
      endSessionUrl: END_SESSION,
    });
    expect(readSessionAccount({ signedIn: true, endSessionUrl: null })).toEqual({ signedIn: true, endSessionUrl: null });
    expect(readSessionAccount({ signedIn: true })).toEqual({ signedIn: true, endSessionUrl: null });
    expect(readSessionAccount({ signedIn: false, endSessionUrl: END_SESSION })).toEqual({
      signedIn: false,
      endSessionUrl: null,
    });
    expect(readSessionAccount(null)).toEqual({ signedIn: false, endSessionUrl: null });
  });

  it("refuses anything that is not an absolute http(s) URL", () => {
    for (const bad of ["javascript:alert(1)", "/oauth2/endsession", "", 42, {}, "data:text/html,x"]) {
      expect(safeEndSessionUrl(bad)).toBeNull();
    }
    expect(safeEndSessionUrl(END_SESSION)).toBe(END_SESSION);
  });
});
