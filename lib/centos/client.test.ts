/**
 * The signed client for CentenarianOS, against a mocked CentenarianOS. No network. The mock checks
 * every request with this repo's verifier, as CentenarianOS would. Values are made up.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FetchLike } from "@/lib/signed/client";
import { buildUrl } from "@/lib/signed/client";
import { verifySignedRequest } from "@/lib/signed/receiver";
import { CENTOS_SECRETS, CENTOS_URL_ENV, centosConfigured, centosGet, centosPost } from "./client";

const SECRET = "vendor-test-secret-not-real-0123456789abcdef";
const RESYNC = "resync-test-secret-not-real-0123456789abcdef";
const NOW = 1_793_400_000;
const ENV = { [CENTOS_URL_ENV]: "https://centos.example.test", [CENTOS_SECRETS.vendors]: SECRET, [CENTOS_SECRETS.resync]: RESYNC };
const parseAny = (d: unknown) => (d && typeof d === "object" ? (d as Record<string, unknown>) : null);

interface Seen {
  url: string;
  method: string;
  verified: boolean;
  body?: string;
}

function mockCentos(reply: (url: URL) => { status: number; body?: unknown; headers?: Record<string, string> } | "throw" | "hang", secret = SECRET) {
  const seen: Seen[] = [];
  const fetchImpl: FetchLike = (input, init) => {
    const url = new URL(input);
    const signed = init.method === "GET" ? `${url.pathname}${url.search}` : (init.body ?? "");
    const verdict = verifySignedRequest({ signed, headers: new Headers(init.headers), secret, expectedSource: "ride-witus", nowSeconds: NOW });
    seen.push({ url: input, method: init.method, verified: verdict.ok, body: init.body });
    const r = reply(url);
    if (r === "throw") return Promise.reject(new TypeError("fetch failed"));
    if (r === "hang") {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
      });
    }
    const text = r.body === undefined ? "" : JSON.stringify(r.body);
    return Promise.resolve({ ok: r.status >= 200 && r.status < 300, status: r.status, text: async () => text, headers: new Headers(r.headers ?? {}) });
  };
  return { seen, fetchImpl };
}

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

describe("configuration", () => {
  it("needs the base URL and the endpoint's own secret; makes no request otherwise", async () => {
    expect(centosConfigured("vendors", ENV)).toBe(true);
    expect(centosConfigured("vendors", { ...ENV, [CENTOS_URL_ENV]: "" })).toBe(false);
    expect(centosConfigured("vendors", { ...ENV, [CENTOS_SECRETS.vendors]: undefined })).toBe(false);
    expect(centosConfigured("resync", { [CENTOS_URL_ENV]: "https://centos.example.test", [CENTOS_SECRETS.vendors]: SECRET })).toBe(false);
    expect(centosConfigured("vendors", { ...ENV, [CENTOS_URL_ENV]: "not a url" })).toBe(false);
    const centos = mockCentos(() => ({ status: 200, body: { ok: true, data: {} } }));
    const result = await centosGet("vendors", "/api/v1/ride/vendors", { witus_sub: "SUB" }, parseAny, { env: {}, fetchImpl: centos.fetchImpl });
    expect(result).toEqual({ ok: false, problem: "not_configured", status: 0 });
    expect(centos.seen).toHaveLength(0);
  });
});

describe("buildUrl", () => {
  it("keeps a base path prefix, drops empty params, and encodes the query once", () => {
    expect(buildUrl("https://h.test", "/api/v1/ride/vendors", { witus_sub: "S", q: "shell oil", limit: 50, offset: null, since: "" }).toString()).toBe(
      "https://h.test/api/v1/ride/vendors?witus_sub=S&q=shell+oil&limit=50"
    );
    expect(buildUrl("https://h.test/prefix/", "/api/x", {}).toString()).toBe("https://h.test/prefix/api/x");
  });
});

describe("centosGet", () => {
  it("200: signs path plus query with the vendor secret as ride-witus, and returns data", async () => {
    const centos = mockCentos(() => ({ status: 200, body: { ok: true, data: { vendors: [], next_offset: null } } }));
    const result = await centosGet("vendors", "/api/v1/ride/vendors", { witus_sub: "SUB_EXAMPLE", q: "shell", limit: 50 }, parseAny, {
      env: ENV,
      fetchImpl: centos.fetchImpl,
      nowSeconds: NOW,
    });
    expect(result).toEqual({ ok: true, data: { vendors: [], next_offset: null } });
    expect(centos.seen).toEqual([{ url: "https://centos.example.test/api/v1/ride/vendors?witus_sub=SUB_EXAMPLE&q=shell&limit=50", method: "GET", verified: true, body: undefined }]);
  });

  it.each([
    [404, { ok: false, code: "unknown_subject", error: "No account" }, "unknown_subject"],
    [404, { ok: false, code: "not_found", error: "Vendor not found." }, "not_found"],
    [401, { ok: false, code: "unauthorized", error: "Unauthorized" }, "unauthorized"],
    [503, { ok: false, code: "not_configured", error: "Not configured" }, "not_configured"],
    [400, { ok: false, code: "invalid_subject", error: "witus_sub is required." }, "bad_request"],
    [500, { ok: false, code: "lookup_failed", error: "x" }, "unavailable"],
    [502, undefined, "unavailable"],
  ])("HTTP %i %j -> %s", async (status, body, problem) => {
    const centos = mockCentos(() => ({ status, body }));
    const result = await centosGet("vendors", "/api/v1/ride/vendors/abc", { witus_sub: "S" }, parseAny, { env: ENV, fetchImpl: centos.fetchImpl, nowSeconds: NOW });
    expect(result).toMatchObject({ ok: false, problem, status });
  });

  it("timeout: gives up after the timeout and says so", async () => {
    const centos = mockCentos(() => "hang");
    const result = await centosGet("vendors", "/api/v1/ride/vendors", { witus_sub: "S" }, parseAny, { env: ENV, fetchImpl: centos.fetchImpl, timeoutMs: 20 });
    expect(result).toEqual({ ok: false, problem: "timeout", status: 0 });
  });

  it("network error = unavailable; 200 with the wrong shape = invalid_response", async () => {
    const down = mockCentos(() => "throw");
    expect(await centosGet("vendors", "/x", {}, parseAny, { env: ENV, fetchImpl: down.fetchImpl })).toEqual({ ok: false, problem: "unavailable", status: 0 });
    const odd = mockCentos(() => ({ status: 200, body: { vendors: [] } }));
    expect(await centosGet("vendors", "/x", {}, parseAny, { env: ENV, fetchImpl: odd.fetchImpl })).toEqual({ ok: false, problem: "invalid_response", status: 200 });
    const rejectedByParser = mockCentos(() => ({ status: 200, body: { ok: true, data: "text" } }));
    expect(await centosGet("vendors", "/x", {}, parseAny, { env: ENV, fetchImpl: rejectedByParser.fetchImpl })).toEqual({
      ok: false,
      problem: "invalid_response",
      status: 200,
    });
  });

  it("never logs the secret or the signature", async () => {
    const centos = mockCentos(() => ({ status: 401, body: { ok: false, code: "unauthorized" } }));
    await centosGet("vendors", "/api/v1/ride/vendors", { witus_sub: "S" }, parseAny, { env: ENV, fetchImpl: centos.fetchImpl, nowSeconds: NOW });
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).not.toContain(SECRET);
    expect(logged).not.toContain("sha256=");
  });
});

describe("centosPost", () => {
  it("signs the exact body with the resync secret; 429 carries Retry-After", async () => {
    const centos = mockCentos(
      () => ({ status: 429, body: { ok: false, code: "rate_limited", error: "One resync per user every 5 minutes." }, headers: { "Retry-After": "240" } }),
      RESYNC
    );
    const result = await centosPost("resync", "/api/v1/ride/resync", { witus_sub: "SUB", scopes: ["calendar"] }, parseAny, {
      env: ENV,
      fetchImpl: centos.fetchImpl,
      nowSeconds: NOW,
    });
    expect(result).toEqual({ ok: false, problem: "rate_limited", status: 429, code: "rate_limited", retryAfterSeconds: 240 });
    expect(centos.seen[0]).toMatchObject({ method: "POST", verified: true, body: '{"witus_sub":"SUB","scopes":["calendar"]}' });
  });
});
