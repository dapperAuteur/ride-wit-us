/**
 * GET /api/auth/session: the public header asks this which account control to show. It must say
 * no when anything goes wrong (so the header falls back to "Sign in"), must never be cached for
 * another visitor, and must not leak who the person is.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// The session lookup reads cookies(), which needs a request scope; stand it in.
const lookup = vi.hoisted(() => ({ fn: async (): Promise<unknown> => null }));
vi.mock("@/lib/auth/dal", () => ({ getCurrentUser: () => lookup.fn() }));

import { GET } from "./route";

beforeEach(() => {
  lookup.fn = async () => null;
});

describe("GET /api/auth/session", () => {
  it("answers signedIn: false with no session", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ signedIn: false });
  });

  it("answers signedIn: true with a session, and nothing about the person", async () => {
    lookup.fn = async () => ({ sub: "abc", email: "rider@example.com", name: "Rider" });
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ signedIn: true });
    expect(JSON.stringify(body)).not.toContain("example.com");
  });

  it("answers signedIn: false when the lookup throws", async () => {
    lookup.fn = async () => {
      throw new Error("boom");
    };
    expect(await (await GET()).json()).toEqual({ signedIn: false });
  });

  it("is never cached", async () => {
    const cc = (await GET()).headers.get("cache-control") ?? "";
    expect(cc).toContain("no-store");
    expect(cc).toContain("private");
  });
});
