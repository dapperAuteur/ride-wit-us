/**
 * The sign-out controls' markup (BAM, 2026-10-29, witus task 128 option (b)).
 *
 * No DOM test setup in this repo (vitest in node), so this renders to static HTML with react-dom's
 * server renderer and reads the markup. The click order ("local first, then the IdP") is pinned on
 * the pure `signOutEverywhere` in lib/witus-sso.test.ts.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SignOutButton } from "@/components/sign-out-button";

const END_SESSION =
  "https://accounts.witus.online/api/idp/oauth2/endsession?client_id=witus-ride" +
  "&post_logout_redirect_uri=https%3A%2F%2Fride.witus.online%2F";
const HELP =
  "Also signs you out of WitUS. Other WitUS apps you are signed in to stay signed in until you sign out of them.";

describe("SignOutButton", () => {
  it("is a local form POST named exactly \"Sign out\" with no everywhere control when unconfigured", () => {
    const html = renderToStaticMarkup(<SignOutButton endSessionUrl={null} />);
    expect(html).toMatch(/<form[^>]*action="\/api\/auth\/signout"[^>]*>/);
    expect(html).toMatch(/<form[^>]*method="post"/);
    expect(html).toMatch(/<button type="submit"[^>]*>Sign out<\/button>/);
    expect(html).not.toContain("Sign out of WitUS");
    expect(html).not.toContain("endsession");
    expect(html).not.toContain(HELP);
  });

  it("keeps the local \"Sign out\" form and adds the everywhere control when configured", () => {
    const html = renderToStaticMarkup(<SignOutButton endSessionUrl={END_SESSION} />);
    // The plain control is unchanged: same local form, same exact name, no IdP URL on it.
    const form = html.match(/<form[^>]*>[\s\S]*?<\/form>/)?.[0] ?? "";
    expect(form).toContain('action="/api/auth/signout"');
    expect(form).toMatch(/<button type="submit"[^>]*>Sign out<\/button>/);
    expect(form).not.toContain("endsession");
    // The everywhere control, described by its help text.
    const button = html.match(/<button type="button"[^>]*>Sign out of WitUS everywhere<\/button>/)?.[0];
    expect(button).toBeTruthy();
    const describedBy = button?.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(describedBy).toBeTruthy();
    expect(html).toContain(`<p id="${describedBy}" class="mt-1 text-xs text-[#221E1B]/70">${HELP}</p>`);
  });
});
