/**
 * Picking a vendor fills the trip (BAM, 2026-11-01). The vendor comes through the real E2 client
 * over a mocked CentenarianOS response, then the pure fill rules decide what changes. No network.
 * Values are made up.
 */
import { describe, expect, it } from "vitest";
import type { FetchLike } from "@/lib/signed/client";
import { CENTOS_SECRETS, CENTOS_URL_ENV } from "@/lib/centos/client";
import { getCentosVendor, vendorTripFill, type CentosVendor } from "@/lib/centos/vendors";
import {
  DESTINATION_LABEL_MAX,
  haversineMeters,
  matchVendorPlace,
  planVendorFill,
  vendorDestinationText,
  type FillPlace,
  type VendorTripFill,
} from "./vendor-fill";

const NOW = 1_793_400_000;
const ENV = { [CENTOS_URL_ENV]: "https://centos.example.test", [CENTOS_SECRETS.vendors]: "fill-test-secret-not-real-0123456789" };
const VENDOR_ID = "00000000-0000-4000-8000-000000000001";
const LOC_A = "00000000-0000-4000-8000-0000000000a1";
const LOC_B = "00000000-0000-4000-8000-0000000000b2";

/** What CentenarianOS's E2 answers: locations with addresses, and no coordinates (PRD §6.9). */
const bikeShop: CentosVendor = {
  id: VENDOR_ID,
  name: "Spoke & Chain",
  company_name: null,
  category: "Bike repair",
  website: null,
  phone: null,
  city: "Indianapolis, IN, US",
  locations: [
    { id: LOC_A, label: "Fountain Square", address: "1060 Virginia Ave", is_default: true },
    { id: LOC_B, label: "Broad Ripple", address: "6302 N Guilford Ave", is_default: false },
  ],
  created_at: "2026-03-02T15:00:00Z",
};

const fetchVendor: FetchLike = () =>
  Promise.resolve({ ok: true, status: 200, text: async () => JSON.stringify({ ok: true, data: { vendor: bikeShop, currency: null } }) });

async function pickedFill(locationId: string | null): Promise<VendorTripFill> {
  const result = await getCentosVendor("SUB_EXAMPLE", VENDOR_ID, { env: ENV, fetchImpl: fetchVendor, nowSeconds: NOW });
  if (!result.ok) throw new Error(`mock failed: ${result.problem}`);
  return vendorTripFill(result.data.vendor, locationId);
}

const home: FillPlace = { id: "p-home", label: "Home", kind: "home", aliases: [], address: null, lat: 39.7684, lng: -86.1581 };
const shopPlace: FillPlace = {
  id: "p-shop",
  label: "Bike shop",
  kind: "other",
  aliases: [],
  address: "1060 Virginia Ave.",
  lat: 39.7553,
  lng: -86.1424,
};
const noCoords: FillPlace = { id: "p-gym", label: "Gym", kind: "gym", aliases: [], address: null, lat: null, lng: null };

const empty = { destination: { placeId: null, label: "" }, distanceText: "" };

describe("vendorTripFill (from the E2 response)", () => {
  it("carries the picked location's label and address", async () => {
    expect(await pickedFill(LOC_B)).toEqual({
      label: "Spoke & Chain · Broad Ripple",
      name: "Spoke & Chain",
      locationLabel: "Broad Ripple",
      address: "6302 N Guilford Ave",
    });
  });

  it("has no address when no location was picked", async () => {
    expect((await pickedFill(null)).address).toBeNull();
  });
});

describe("planVendorFill", () => {
  it("fills an empty To with the vendor's name, location and address when no saved place matches", async () => {
    const plan = planVendorFill({ fill: await pickedFill(LOC_B), places: [home], originPlaceId: home.id, ...empty });
    expect(plan.destination).toEqual({ label: "Spoke & Chain · Broad Ripple, 6302 N Guilford Ave" });
    expect(plan.filled).toEqual(["To"]);
    // The vendor API has no coordinates, so an unmatched vendor gets no distance.
    expect(plan.estimate).toBeNull();
  });

  it("links the saved place the vendor's address matches, and estimates the distance from a saved origin", async () => {
    const plan = planVendorFill({ fill: await pickedFill(LOC_A), places: [home, shopPlace], originPlaceId: home.id, ...empty });
    expect(plan.destination).toEqual({ placeId: "p-shop" });
    expect(plan.filled).toEqual(["To", "Distance"]);
    expect(plan.estimate?.from).toBe("Home");
    expect(plan.estimate?.to).toBe("Bike shop");
    expect(plan.estimate?.meters).toBeGreaterThan(1900);
    expect(plan.estimate?.meters).toBeLessThan(2100);
  });

  it("never replaces what the rider entered", async () => {
    const plan = planVendorFill({
      fill: await pickedFill(LOC_A),
      places: [home, shopPlace],
      originPlaceId: home.id,
      destination: { placeId: null, label: "Mom's house" },
      distanceText: "3.2",
    });
    expect(plan.destination).toBeNull();
    expect(plan.estimate).toBeNull();
    expect(plan.filled).toEqual([]);
    expect(plan.kept).toEqual(["To", "Distance"]);
  });

  it("estimates to a saved To the rider already chose, when the distance is empty", async () => {
    const plan = planVendorFill({
      fill: await pickedFill(LOC_B),
      places: [home, shopPlace],
      originPlaceId: home.id,
      destination: { placeId: "p-shop", label: "" },
      distanceText: "",
    });
    expect(plan.destination).toBeNull();
    expect(plan.kept).toEqual(["To"]);
    expect(plan.filled).toEqual(["Distance"]);
  });

  it("gives no estimate without coordinates at both ends, or with no saved origin", async () => {
    const fill = await pickedFill(LOC_A);
    const gymMatch: FillPlace = { ...noCoords, aliases: ["1060 Virginia Ave"] };
    expect(planVendorFill({ fill, places: [home, gymMatch], originPlaceId: home.id, ...empty }).estimate).toBeNull();
    expect(planVendorFill({ fill, places: [home, shopPlace], originPlaceId: null, ...empty }).estimate).toBeNull();
    expect(planVendorFill({ fill, places: [noCoords, shopPlace], originPlaceId: noCoords.id, ...empty }).estimate).toBeNull();
  });

  it("gives no estimate from a place to itself", async () => {
    const plan = planVendorFill({ fill: await pickedFill(LOC_A), places: [shopPlace], originPlaceId: shopPlace.id, ...empty });
    expect(plan.estimate).toBeNull();
  });
});

describe("matching a vendor to a saved place", () => {
  it("matches by label or alias, as typed text would", async () => {
    const aliased: FillPlace = { ...noCoords, id: "p-alias", label: "LBS", aliases: ["Spoke & Chain Broad Ripple"] };
    expect(matchVendorPlace(await pickedFill(LOC_B), [aliased])?.id).toBe("p-alias");
  });

  it("does not match on a different address", async () => {
    expect(matchVendorPlace(await pickedFill(LOC_B), [shopPlace])).toBeNull();
  });
});

describe("vendorDestinationText", () => {
  it("fits the To field's limit", () => {
    const long = vendorDestinationText({ label: "V".repeat(120), name: "V", locationLabel: null, address: "A".repeat(120) });
    expect(long.length).toBeLessThanOrEqual(DESTINATION_LABEL_MAX);
  });
});

describe("haversineMeters", () => {
  it("measures one degree of latitude as about 111.2 km", () => {
    expect(haversineMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -1);
  });

  it("is zero for the same point and symmetric", () => {
    const a = { lat: 39.7684, lng: -86.1581 };
    const b = { lat: 41.8781, lng: -87.6298 };
    expect(haversineMeters(a, a)).toBe(0);
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
    // Indianapolis to Chicago, straight line: about 265 km.
    expect(haversineMeters(a, b) / 1000).toBeGreaterThan(255);
    expect(haversineMeters(a, b) / 1000).toBeLessThan(275);
  });
});
