/**
 * The vendor client over a mocked CentenarianOS API (contract E1 to E3): the requests it signs,
 * the shapes it accepts, and what each failure becomes on screen. No network. Values are made up.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FetchLike } from "@/lib/signed/client";
import { verifySignedRequest } from "@/lib/signed/receiver";
import { CENTOS_SECRETS, CENTOS_URL_ENV } from "./client";
import { centosProblemCopy } from "./messages";
import {
  getCentosVendor,
  getCentosVendorPrices,
  priceText,
  searchCentosVendors,
  vendorChoices,
  vendorLabel,
  type CentosVendor,
} from "./vendors";

const SECRET = "vendor-test-secret-not-real-0123456789abcdef";
const NOW = 1_793_400_000;
const ENV = { [CENTOS_URL_ENV]: "https://centos.example.test", [CENTOS_SECRETS.vendors]: SECRET };
const VENDOR_ID = "00000000-0000-4000-8000-000000000001";
const LOC_A = "00000000-0000-4000-8000-0000000000a1";
const LOC_B = "00000000-0000-4000-8000-0000000000b2";

const shell: CentosVendor = {
  id: VENDOR_ID,
  name: "Shell on Main",
  company_name: "Shell",
  category: "Fuel",
  website: null,
  phone: "555-0100",
  city: "Indianapolis, IN, US",
  locations: [{ id: LOC_A, label: "Main St", address: "100 Main St", is_default: true }],
  created_at: "2026-03-02T15:00:00Z",
};

function mock(reply: (url: URL) => { status: number; body?: unknown } | "hang") {
  const urls: string[] = [];
  let verified = true;
  const fetchImpl: FetchLike = (input, init) => {
    const url = new URL(input);
    urls.push(input);
    verified &&= verifySignedRequest({
      signed: `${url.pathname}${url.search}`,
      headers: new Headers(init.headers),
      secret: SECRET,
      expectedSource: "ride-witus",
      nowSeconds: NOW,
    }).ok;
    const r = reply(url);
    if (r === "hang") {
      return new Promise((_res, rej) => init.signal?.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" }))));
    }
    const text = r.body === undefined ? "" : JSON.stringify(r.body);
    return Promise.resolve({ ok: r.status < 300, status: r.status, text: async () => text });
  };
  return { urls, fetchImpl, verified: () => verified };
}

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

describe("searchCentosVendors (E1)", () => {
  it("200: sends witus_sub, q and limit, signed, and returns the checked page", async () => {
    const api = mock(() => ({
      status: 200,
      body: { ok: true, data: { vendors: [shell], next_offset: null, currency: null, create_vendor_url: "https://centos.example.test/dashboard/contacts/new?type=vendor&name=shell" } },
    }));
    const result = await searchCentosVendors("SUB_EXAMPLE", { q: "  shell " }, { env: ENV, fetchImpl: api.fetchImpl, nowSeconds: NOW });
    expect(result.ok && result.data.vendors[0].name).toBe("Shell on Main");
    expect(api.urls).toEqual(["https://centos.example.test/api/v1/ride/vendors?witus_sub=SUB_EXAMPLE&q=shell&limit=20"]);
    expect(api.verified()).toBe(true);
  });

  it("an empty query sends no q", async () => {
    const api = mock(() => ({ status: 200, body: { ok: true, data: { vendors: [], next_offset: null, currency: null, create_vendor_url: "https://x.test/" } } }));
    await searchCentosVendors("S", { q: "" }, { env: ENV, fetchImpl: api.fetchImpl, nowSeconds: NOW });
    expect(api.urls[0]).toBe("https://centos.example.test/api/v1/ride/vendors?witus_sub=S&limit=20");
  });

  it("404 unknown_subject -> unknown_subject, and the screen says to connect CentenarianOS", async () => {
    const api = mock(() => ({ status: 404, body: { ok: false, code: "unknown_subject", error: "No CentenarianOS account is linked to this WitUS account yet." } }));
    const result = await searchCentosVendors("S", { q: "x" }, { env: ENV, fetchImpl: api.fetchImpl, nowSeconds: NOW });
    expect(result).toMatchObject({ ok: false, problem: "unknown_subject" });
    expect(centosProblemCopy("unknown_subject").title).toBe("Connect CentenarianOS");
    expect(centosProblemCopy("unknown_subject").body).toMatch(/Sign in to CentenarianOS once with your WitUS account/);
  });

  it("timeout -> timeout", async () => {
    const api = mock(() => "hang");
    const result = await searchCentosVendors("S", { q: "x" }, { env: ENV, fetchImpl: api.fetchImpl, timeoutMs: 20 });
    expect(result).toEqual({ ok: false, problem: "timeout", status: 0 });
    expect(centosProblemCopy("timeout").title).toMatch(/didn't answer/);
  });

  it("503 not_configured on CentenarianOS, or no env here -> not_configured", async () => {
    const api = mock(() => ({ status: 503, body: { ok: false, code: "not_configured", error: "Not configured" } }));
    expect(await searchCentosVendors("S", {}, { env: ENV, fetchImpl: api.fetchImpl, nowSeconds: NOW })).toMatchObject({ ok: false, problem: "not_configured", status: 503 });
    const none = mock(() => ({ status: 200 }));
    expect(await searchCentosVendors("S", {}, { env: {}, fetchImpl: none.fetchImpl })).toEqual({ ok: false, problem: "not_configured", status: 0 });
    expect(none.urls).toHaveLength(0);
    expect(centosProblemCopy("not_configured").title).toMatch(/aren't switched on yet/);
  });

  it("a vendor with coordinates or an unexpected shape is refused as invalid_response", async () => {
    const api = mock(() => ({ status: 200, body: { ok: true, data: { vendors: [{ id: 1 }], next_offset: null, currency: null, create_vendor_url: "x" } } }));
    expect(await searchCentosVendors("S", {}, { env: ENV, fetchImpl: api.fetchImpl, nowSeconds: NOW })).toMatchObject({ ok: false, problem: "invalid_response" });
  });
});

describe("getCentosVendor (E2) and getCentosVendorPrices (E3)", () => {
  it("one vendor by id; a malformed id never leaves RideWitUS", async () => {
    const api = mock(() => ({ status: 200, body: { ok: true, data: { vendor: shell, currency: null } } }));
    const result = await getCentosVendor("SUB", VENDOR_ID, { env: ENV, fetchImpl: api.fetchImpl, nowSeconds: NOW });
    expect(result.ok && result.data.vendor.id).toBe(VENDOR_ID);
    expect(api.urls).toEqual([`https://centos.example.test/api/v1/ride/vendors/${VENDOR_ID}?witus_sub=SUB`]);
    expect(await getCentosVendor("SUB", "../admin", { env: ENV, fetchImpl: api.fetchImpl })).toEqual({ ok: false, problem: "not_found", status: 0 });
    expect(api.urls).toHaveLength(1);
  });

  it("404 not_found (not this user's vendor) -> not_found", async () => {
    const api = mock(() => ({ status: 404, body: { ok: false, code: "not_found", error: "Vendor not found." } }));
    expect(await getCentosVendor("SUB", VENDOR_ID, { env: ENV, fetchImpl: api.fetchImpl, nowSeconds: NOW })).toMatchObject({ ok: false, problem: "not_found" });
  });

  it("prices: signed GET with since and limit; currency stays null", async () => {
    const api = mock(() => ({
      status: 200,
      body: {
        ok: true,
        data: {
          vendor_id: VENDOR_ID,
          since: "2026-05-04",
          prices: [{ item_name: "Regular", price: 3.41, unit: "gal", unit_price: 3.41, recorded_date: "2026-10-30", source: "receipt" }],
          currency: null,
        },
      },
    }));
    const result = await getCentosVendorPrices("SUB", VENDOR_ID, { since: "2026-05-04", limit: 20 }, { env: ENV, fetchImpl: api.fetchImpl, nowSeconds: NOW });
    expect(result.ok && result.data.prices).toHaveLength(1);
    expect(result.ok && result.data.currency).toBeNull();
    expect(api.urls[0]).toBe(`https://centos.example.test/api/v1/ride/vendors/${VENDOR_ID}/prices?witus_sub=SUB&since=2026-05-04&limit=20`);
  });
});

describe("display helpers", () => {
  it("one choice per vendor, or one per location when there are several", () => {
    const two = { ...shell, locations: [...shell.locations, { id: LOC_B, label: "Airport", address: null, is_default: false }] };
    expect(vendorChoices([shell])).toEqual([{ contactId: VENDOR_ID, locationId: LOC_A, label: "Shell on Main · Main St", detail: "100 Main St" }]);
    expect(vendorChoices([two]).map((c) => [c.locationId, c.label, c.detail])).toEqual([
      [LOC_A, "Shell on Main · Main St", "100 Main St"],
      [LOC_B, "Shell on Main · Airport", "Fuel · Indianapolis, IN, US"],
    ]);
    expect(vendorChoices([{ ...shell, locations: [] }])[0]).toMatchObject({ locationId: null, label: "Shell on Main", detail: "Fuel · Indianapolis, IN, US" });
  });

  it("vendorLabel falls back to the name for an unknown location", () => {
    expect(vendorLabel(shell, null)).toBe("Shell on Main");
    expect(vendorLabel(shell, LOC_B)).toBe("Shell on Main");
  });

  it("prices show no guessed currency symbol", () => {
    expect(priceText({ price: 48.1, unit: null, unit_price: null }, null)).toBe("48.10");
    expect(priceText({ price: 34.1, unit: "gal", unit_price: 3.41 }, null)).toBe("34.10 (3.41 per gal)");
    expect(priceText({ price: 34.1, unit: "gal", unit_price: 3.41 }, "USD")).toBe("34.10 USD (3.41 USD per gal)");
    expect(priceText({ price: 5, unit: "each", unit_price: null }, null)).toBe("5.00 per each");
  });

  it("every problem has words; rate limits say how long", () => {
    for (const p of ["not_configured", "unknown_subject", "not_found", "rate_limited", "unauthorized", "bad_request", "timeout", "unavailable", "invalid_response"] as const) {
      const copy = centosProblemCopy(p);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.body.length).toBeGreaterThan(0);
    }
    expect(centosProblemCopy("rate_limited", 240).body).toBe("Try again in 4 minutes.");
  });
});
