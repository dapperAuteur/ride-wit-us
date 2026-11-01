/**
 * The public header's account control (shared UI rule, witus docs/shared-ui-ux-dx.md, "Sign-in
 * control"): signed out it shows a link named exactly "Sign in" to /signin; signed in it shows
 * "Open the app" and "Sign out". BAM could not find where to log in on 2026-10-31 because the
 * header had neither; these fail if either branch goes missing again.
 *
 * No DOM test setup in this repo (vitest in node), so this renders to static HTML, which is also
 * what a statically prerendered page ships before the session probe runs.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HeaderAccount } from "@/components/header-account";
import { readSessionProbe, sectionLinks } from "@/components/header-links";
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

describe("readSessionProbe", () => {
  it("reads only an explicit signedIn: true as signed in", () => {
    expect(readSessionProbe({ signedIn: true })).toBe(true);
    for (const body of [{ signedIn: false }, { signedIn: "true" }, {}, null, undefined, "ok", 1]) {
      expect(readSessionProbe(body)).toBe(false);
    }
  });
});
