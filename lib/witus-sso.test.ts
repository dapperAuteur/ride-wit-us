/**
 * WitUS SSO helpers — "Continue as <name>" and "Sign out of WitUS everywhere".
 *
 * Offline and deterministic: no network, no DOM. It pins the things that are expensive to get wrong
 * and invisible when they are — the derived IdP URLs, the trailing slash on the post-logout URI,
 * the callback path the IdP registry has to match, the loop guard, and the fact that a name from
 * another origin is sanitized display copy rather than a credential.
 */
import { describe, expect, it } from "vitest";

import {
  DEFAULT_WITUS_OIDC_ISSUER,
  SIGN_OUT_EVERYWHERE_HELP,
  SIGN_OUT_EVERYWHERE_LABEL,
  SIGN_OUT_LABEL,
  signOutEverywhere,
  WITUS_CALLBACK_PATH,
  continueAsLabel,
  hasAttemptMarker,
  parseSilentSsoIdentity,
  silentSsoDecision,
  withAttemptMarker,
  witusIdpEndpoints,
  witusPostLogoutRedirectUri,
  witusRedirectUri,
} from "@/lib/witus-sso";

describe("IdP URLs derived from one issuer", () => {
  it("derives the four OIDC endpoints under the issuer's basePath", () => {
    const e = witusIdpEndpoints(DEFAULT_WITUS_OIDC_ISSUER);
    expect(e?.authorize).toBe("https://accounts.witus.online/api/idp/oauth2/authorize");
    expect(e?.token).toBe("https://accounts.witus.online/api/idp/oauth2/token");
    expect(e?.userinfo).toBe("https://accounts.witus.online/api/idp/oauth2/userinfo");
    expect(e?.endSession).toBe("https://accounts.witus.online/api/idp/oauth2/endsession");
  });

  it("derives the ecosystem probe from the IdP ORIGIN, not the basePath", () => {
    // /api/ecosystem/session is the accounts app's own route, not a better-auth one.
    expect(witusIdpEndpoints(DEFAULT_WITUS_OIDC_ISSUER)?.probe).toBe(
      "https://accounts.witus.online/api/ecosystem/session"
    );
  });

  it("follows an override to a different host and basePath", () => {
    const e = witusIdpEndpoints("https://idp.example.test/auth/");
    expect(e?.endSession).toBe("https://idp.example.test/auth/oauth2/endsession");
    expect(e?.probe).toBe("https://idp.example.test/api/ecosystem/session");
  });

  it("returns null rather than inventing a URL when the issuer is unusable", () => {
    for (const bad of [null, undefined, "", "not-a-url", "accounts.witus.online", "ftp://x/y"]) {
      expect(witusIdpEndpoints(bad)).toBeNull();
    }
  });
});

describe("this app's registered URIs", () => {
  it("builds the redirect_uri from the bespoke callback path, not Better Auth's", () => {
    // This app runs its own OIDC code flow, so the IdP registry entry for `ride` must hold THIS
    // string. Better Auth's /api/auth/oauth2/callback/witus would never be reached.
    expect(WITUS_CALLBACK_PATH).toBe("/api/auth/witus/callback");
    expect(witusRedirectUri("https://ride.witus.online")).toBe(
      "https://ride.witus.online/api/auth/witus/callback"
    );
  });

  it("keeps the trailing slash on post_logout_redirect_uri", () => {
    // better-auth exact-matches this against the client's registered redirectUrls, and the registry
    // registers `origin + "/"`. Drop the slash and sign-out is a 400.
    expect(witusPostLogoutRedirectUri("https://ride.witus.online")).toBe(
      "https://ride.witus.online/"
    );
  });

  it("normalises a configured site URL that already ends in a slash", () => {
    expect(witusPostLogoutRedirectUri("https://ride.witus.online/")).toBe(
      "https://ride.witus.online/"
    );
    expect(witusRedirectUri("https://ride.witus.online/")).toBe(
      "https://ride.witus.online/api/auth/witus/callback"
    );
  });
});

describe("the loop guard", () => {
  it("recognises the marker and ignores anything else", () => {
    expect(hasAttemptMarker("?sso=tried")).toBe(true);
    expect(hasAttemptMarker("sso=tried")).toBe(true);
    expect(hasAttemptMarker("?sso=nope")).toBe(false);
    expect(hasAttemptMarker("?error=witus_state")).toBe(false);
    expect(hasAttemptMarker("")).toBe(false);
    expect(hasAttemptMarker(null)).toBe(false);
  });

  it("adds the marker without losing the error code the page needs", () => {
    const marked = withAttemptMarker("/signin?error=witus_state");
    expect(hasAttemptMarker(marked.slice(marked.indexOf("?")))).toBe(true);
    expect(marked).toContain("error=witus_state");
  });

  it("skips the probe once an attempt has been marked, by either half", () => {
    const endpoint = "https://accounts.witus.online/api/ecosystem/session";
    expect(silentSsoDecision({ endpoint, attempted: true })).toEqual({
      attempt: false,
      skip: "already-attempted",
    });
    expect(silentSsoDecision({ endpoint, search: "?sso=tried" })).toEqual({
      attempt: false,
      skip: "already-attempted",
    });
    expect(silentSsoDecision({ endpoint, search: "?error=witus_state" })).toEqual({ attempt: true });
  });

  it("stays dark when the app is not a configured OIDC client", () => {
    expect(silentSsoDecision({ endpoint: null })).toEqual({
      attempt: false,
      skip: "not-configured",
    });
  });

  it("does not ask who you are when you are already signed in here", () => {
    expect(
      silentSsoDecision({
        endpoint: "https://accounts.witus.online/api/ecosystem/session",
        signedIn: true,
      })
    ).toEqual({ attempt: false, skip: "already-signed-in" });
  });
});

describe("the probe response is display copy, never a credential", () => {
  it("reads a name out of the documented shape", () => {
    expect(parseSilentSsoIdentity({ signedIn: true, user: { name: "Ada Lovelace" } })).toEqual({
      label: "Ada Lovelace",
    });
  });

  it("renders nothing for a signed-out answer or a junk one", () => {
    expect(parseSilentSsoIdentity({ signedIn: false })).toBeNull();
    expect(parseSilentSsoIdentity({ signedIn: false, user: { name: "Ada" } })).toBeNull();
    expect(parseSilentSsoIdentity(null)).toBeNull();
    expect(parseSilentSsoIdentity("Ada")).toBeNull();
    expect(parseSilentSsoIdentity({ user: { name: 42 } })).toBeNull();
  });

  it("strips control characters and collapses surrounding whitespace", () => {
    const hostile = `  Ada${String.fromCharCode(10)}Love${String.fromCharCode(127)}lace  `;
    expect(parseSilentSsoIdentity({ user: { name: hostile } })).toEqual({ label: "AdaLovelace" });
  });

  it("caps an absurd name so it cannot blow up the button", () => {
    const found = parseSilentSsoIdentity({ user: { name: "A".repeat(500) } });
    expect(found?.label.length).toBe(48);
    expect(found?.label.endsWith("…")).toBe(true);
  });

  it("pins the exact copy the visitor reads", () => {
    expect(continueAsLabel(null)).toBe("Sign in with WitUS");
    expect(continueAsLabel({ label: "Ada" })).toBe("Continue as Ada");
  });
});

describe("Sign out vs. Sign out of WitUS everywhere (BAM, 2026-10-29, witus task 128 (b))", () => {
  const END_SESSION =
    "https://accounts.witus.online/api/idp/oauth2/endsession?client_id=witus-ride" +
    `&post_logout_redirect_uri=${encodeURIComponent(witusPostLogoutRedirectUri("https://ride.witus.online"))}`;

  it("keeps the exact copy", () => {
    expect(SIGN_OUT_LABEL).toBe("Sign out");
    expect(SIGN_OUT_EVERYWHERE_LABEL).toBe("Sign out of WitUS everywhere");
    expect(SIGN_OUT_EVERYWHERE_HELP).toBe(
      "Also signs you out of WitUS. Other WitUS apps you are signed in to stay signed in until you sign out of them."
    );
  });

  it("ends the local session BEFORE navigating to the IdP", async () => {
    const calls: string[] = [];
    let release: () => void = () => {};
    const local = new Promise<void>((resolve) => {
      release = resolve;
    });
    const run = signOutEverywhere({
      signOutLocal: async () => {
        calls.push("local:start");
        await local;
        calls.push("local:done");
      },
      navigate: (url) => calls.push(`navigate:${url}`),
      endSessionUrl: END_SESSION,
    });
    await Promise.resolve();
    expect(calls).toEqual(["local:start"]);
    release();
    await run;
    expect(calls).toEqual(["local:start", "local:done", `navigate:${END_SESSION}`]);
    expect(END_SESSION).toContain("/oauth2/endsession?client_id=");
    expect(END_SESSION).toContain("post_logout_redirect_uri=https%3A%2F%2Fride.witus.online%2F");
  });

  it("still hands off when the local request fails", async () => {
    const navigated: string[] = [];
    await signOutEverywhere({
      signOutLocal: () => Promise.reject(new Error("offline")),
      navigate: (url) => navigated.push(url),
      endSessionUrl: END_SESSION,
    });
    expect(navigated).toEqual([END_SESSION]);
  });
});
