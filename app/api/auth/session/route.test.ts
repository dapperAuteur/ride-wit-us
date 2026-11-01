/**
 * GET /api/auth/session: the public header asks this which account control to show. It must say
 * no when anything goes wrong (so the header falls back to "Sign in"), must never be cached for
 * another visitor, and must not leak who the person is.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// The session lookup reads cookies(), which needs a request scope; stand it in.
const lookup = vi.hoisted(() => ({ fn: async (): Promise<unknown> => null }));
vi.mock("@/lib/auth/dal", () => ({ getCurrentUser: () => lookup.fn() }));
// The IdP logout URL is built from env and the request host; stand in what it returns.
const endSession = vi.hoisted(() => ({ url: null as string | null }));
vi.mock("@/lib/witus-sso-config", () => ({ witusEndSessionUrl: async () => endSession.url }));

import { GET } from "./route";

const END_SESSION = "https://accounts.witus.online/api/idp/oauth2/endsession?client_id=witus-ride";

beforeEach(() => {
  lookup.fn = async () => null;
  endSession.url = END_SESSION;
});

describe("GET /api/auth/session", () => {
  it("answers signedIn: false with no session", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ signedIn: false, endSessionUrl: null });
  });

  it("answers signedIn: true with a session, and nothing about the person", async () => {
    lookup.fn = async () => ({ sub: "abc", email: "rider@example.com", name: "Rider" });
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ signedIn: true, endSessionUrl: END_SESSION });
    expect(JSON.stringify(body)).not.toContain("example.com");
  });

  it("answers endSessionUrl: null when this app is not a configured WitUS client", async () => {
    lookup.fn = async () => ({ sub: "abc", email: "rider@example.com", name: "Rider" });
    endSession.url = null;
    expect(await (await GET()).json()).toEqual({ signedIn: true, endSessionUrl: null });
  });

  it("answers signedIn: false when the lookup throws", async () => {
    lookup.fn = async () => {
      throw new Error("boom");
    };
    expect(await (await GET()).json()).toEqual({ signedIn: false, endSessionUrl: null });
  });

  it("is never cached", async () => {
    const cc = (await GET()).headers.get("cache-control") ?? "";
    expect(cc).toContain("no-store");
    expect(cc).toContain("private");
  });
});
