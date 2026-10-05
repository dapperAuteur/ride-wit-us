import { describe, expect, it } from "vitest";
import { nightsBetween, parseJourneyForm, parseStayForm } from "./journey-form";
import { parsePlaceForm } from "./place-form";
import { findAliasConflict, matchPlace, parseAliases, resolvePlaceRef, shareablePlace, type PlaceLike } from "./places";
import { parseTripForm } from "./trip-form";
import { parseVehicleForm } from "./vehicle-form";

const VEHICLE_BASE = { inputUnits: "imperial", kind: "bike", nickname: "Blue Brompton", ownership: "owned" };
const TRIP_BASE = { inputUnits: "imperial", mode: "bike", status: "completed", startDate: "2026-10-05" };

describe("vehicle form", () => {
  it("accepts the minimum and stores no money or distance", () => {
    const r = parseVehicleForm(VEHICLE_BASE);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({ kind: "bike", nickname: "Blue Brompton", ownership: "owned", isActive: false });
      expect(r.data.odometerOffsetM).toBeNull();
      expect(r.data.purchaseCurrency).toBeNull();
    }
  });

  it("converts distances typed in miles to meters at the form boundary", () => {
    const r = parseVehicleForm({ ...VEHICLE_BASE, odometer: "1,000", expectedLife: "3000", isActive: "on" });
    expect(r.ok && r.data.odometerOffsetM).toBeCloseTo(1_609_344, 6);
    expect(r.ok && r.data.expectedLifeM).toBeCloseTo(4_828_032, 6);
    expect(r.ok && r.data.isActive).toBe(true);
  });

  it("converts kilometers when the page was showing metric", () => {
    const r = parseVehicleForm({ ...VEHICLE_BASE, inputUnits: "metric", odometer: "12.5" });
    expect(r.ok && r.data.odometerOffsetM).toBe(12_500);
  });

  it("requires a currency with a price, and drops a lone pre-filled currency", () => {
    const missing = parseVehicleForm({ ...VEHICLE_BASE, purchasePrice: "1450" });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.fieldErrors.purchaseCurrency).toMatch(/currency/);
    const lone = parseVehicleForm({ ...VEHICLE_BASE, purchaseCurrency: "usd" });
    expect(lone.ok && lone.data.purchaseCurrency).toBeNull();
    const ok = parseVehicleForm({ ...VEHICLE_BASE, purchasePrice: "1450.00", purchaseCurrency: "gbp" });
    expect(ok.ok && [ok.data.purchasePrice, ok.data.purchaseCurrency]).toEqual(["1450.00", "GBP"]);
  });

  it("explains each bad field", () => {
    const r = parseVehicleForm({ inputUnits: "imperial", kind: "boat", nickname: "", ownership: "stolen", year: "1700", odometer: "-1" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.fieldErrors).sort()).toEqual(["kind", "nickname", "odometer", "ownership", "year"]);
      expect(r.fieldErrors.nickname).toMatch(/name/);
    }
  });

  it("refuses an unknown input unit system rather than guessing", () => {
    expect(parseVehicleForm({ ...VEHICLE_BASE, inputUnits: "furlongs" }).ok).toBe(false);
  });
});

describe("trip form", () => {
  it("stores distance in meters and duration in seconds", () => {
    const r = parseTripForm({ ...TRIP_BASE, distance: "10", durationMin: "42.5" });
    expect(r.ok && r.data.distanceM).toBeCloseTo(16_093.44, 6);
    expect(r.ok && r.data.durationS).toBe(2550);
    const km = parseTripForm({ ...TRIP_BASE, inputUnits: "metric", distance: "10" });
    expect(km.ok && km.data.distanceM).toBe(10_000);
  });

  it("keeps a round trip's distance one way", () => {
    const r = parseTripForm({ ...TRIP_BASE, distance: "5", isRoundTrip: "on" });
    expect(r.ok && r.data.isRoundTrip).toBe(true);
    expect(r.ok && r.data.distanceM).toBeCloseTo(8046.72, 6);
  });

  it("keeps the original amount and currency", () => {
    const r = parseTripForm({ ...TRIP_BASE, mode: "bus", costAmount: "1,850", costCurrency: "mxn" });
    expect(r.ok && [r.data.costAmount, r.data.costCurrency]).toEqual(["1850", "MXN"]);
    const noCurrency = parseTripForm({ ...TRIP_BASE, costAmount: "3" });
    expect(!noCurrency.ok && noCurrency.fieldErrors.costCurrency).toMatch(/currency/);
  });

  it("stores a flight's times as instants with their zones", () => {
    const r = parseTripForm({
      ...TRIP_BASE,
      startDate: "",
      mode: "plane",
      flightNumber: "aa 1234",
      carrierName: "American",
      departLocal: "2026-10-05T08:10",
      departTz: "America/Chicago",
      arriveLocal: "2026-10-05T11:45",
      arriveTz: "America/New_York",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.startDate).toBe("2026-10-05");
      expect(r.data.departedAt?.toISOString()).toBe("2026-10-05T13:10:00.000Z");
      expect(r.data.arrivedAt?.toISOString()).toBe("2026-10-05T15:45:00.000Z");
      expect([r.data.departTz, r.data.arriveTz]).toEqual(["America/Chicago", "America/New_York"]);
      expect(r.data.flightNumber).toBe("AA 1234");
    }
  });

  it("catches an arrival before departure once zones are applied", () => {
    // 10:00 in New York is 09:00 in Chicago: before the 09:30 Chicago departure.
    const r = parseTripForm({
      ...TRIP_BASE,
      mode: "plane",
      departLocal: "2026-10-05T09:30",
      departTz: "America/Chicago",
      arriveLocal: "2026-10-05T10:00",
      arriveTz: "America/New_York",
    });
    expect(!r.ok && r.fieldErrors.arriveLocal).toMatch(/before departure/);
  });

  it("needs a zone for a time, and a date for the trip", () => {
    const r = parseTripForm({ ...TRIP_BASE, departLocal: "2026-10-05T08:00" });
    expect(!r.ok && r.fieldErrors.departTz).toMatch(/time zone/);
    const noDate = parseTripForm({ ...TRIP_BASE, startDate: "" });
    expect(!noDate.ok && noDate.fieldErrors.startDate).toMatch(/date/);
  });

  it("drops a flight number on a non-flight and fitness on a car trip", () => {
    const r = parseTripForm({ ...TRIP_BASE, mode: "car", flightNumber: "AA1", category: "fitness" });
    expect(r.ok && [r.data.flightNumber, r.data.category]).toEqual([null, "travel"]);
    const ride = parseTripForm({ ...TRIP_BASE, category: "fitness" });
    expect(ride.ok && ride.data.category).toBe("fitness");
  });

  it("refuses ids that aren't ids and links that aren't web links", () => {
    const r = parseTripForm({ ...TRIP_BASE, vehicleId: "1 OR 1=1", bookingUrl: "javascript:alert(1)" });
    expect(!r.ok && Object.keys(r.fieldErrors).sort()).toEqual(["bookingUrl", "vehicleId"]);
  });
});

describe("journey and stay forms", () => {
  it("validates a journey's dates", () => {
    expect(parseJourneyForm({ name: "Chicago", status: "planned", startDate: "2026-10-09", endDate: "2026-10-12" }).ok).toBe(true);
    const noName = parseJourneyForm({ name: "", status: "planned", startDate: "2026-10-09" });
    expect(!noName.ok && Object.keys(noName.fieldErrors)).toEqual(["name"]);
    const r = parseJourneyForm({ name: "Chicago", status: "planned", startDate: "2026-10-09", endDate: "2026-10-01" });
    expect(!r.ok && r.fieldErrors.endDate).toMatch(/before the first day/);
  });

  it("validates a stay and counts nights", () => {
    const r = parseStayForm({ name: "Hotel", checkInDate: "2026-10-09", checkOutDate: "2026-10-12", costAmount: "600", costCurrency: "usd" });
    expect(r.ok && [r.data.costAmount, r.data.costCurrency]).toEqual(["600", "USD"]);
    const bad = parseStayForm({ name: "Hotel", checkInDate: "2026-10-09", checkOutDate: "2026-10-08" });
    expect(!bad.ok && bad.fieldErrors.checkOutDate).toMatch(/before check-in/);
    expect(nightsBetween("2026-10-09", "2026-10-12")).toBe(3);
  });
});

describe("places", () => {
  const places: PlaceLike[] = [
    { id: "p-home", label: "Home", kind: "home", aliases: ["The apartment"] },
    { id: "p-blue", label: "Blue Note", kind: "venue", aliases: ["Blue Note Jazz Club, 131 W 3rd St"] },
  ];

  it("matches by label or alias, ignoring case and punctuation", () => {
    expect(matchPlace("blue note jazz club 131 w 3rd st", places)?.id).toBe("p-blue");
    expect(matchPlace("  THE APARTMENT ", places)?.id).toBe("p-home");
    expect(matchPlace("Blue Bottle", places)).toBeNull();
  });

  it("refuses a new place that answers to an existing name", () => {
    expect(findAliasConflict({ label: "Jazz", aliases: ["blue note"] }, places)?.placeId).toBe("p-blue");
    expect(findAliasConflict({ label: "Blue Note", aliases: [] }, places, "p-blue")).toBeNull();
    expect(findAliasConflict({ label: "Gym", aliases: [] }, places)).toBeNull();
  });

  it("parses aliases: one per line or comma, no duplicates, not the label", () => {
    expect(parseAliases("Blue Note\nBN, bn\n\n  Jazz   club ", "Blue Note")).toEqual(["BN", "Jazz club"]);
  });

  it("resolves a typed trip end to a saved place", () => {
    expect(resolvePlaceRef(null, "the apartment", places)).toEqual({ placeId: "p-home", label: "Home" });
    expect(resolvePlaceRef(null, "Somewhere new", places)).toEqual({ placeId: null, label: "Somewhere new" });
    expect(resolvePlaceRef("p-blue", null, places)).toEqual({ placeId: "p-blue", label: "Blue Note" });
  });

  it("never lets the home place leave RideWitUS", () => {
    expect(shareablePlace(places[0])).toBeNull();
    expect(shareablePlace(places[1])).toEqual({ id: "p-blue", label: "Blue Note" });
  });

  it("validates the place form", () => {
    const r = parsePlaceForm({ label: "Gym", kind: "gym", aliases: "Planet, planet fitness", lat: "41.9", lng: "" });
    expect(!r.ok && r.fieldErrors.lng).toMatch(/both/);
    const ok = parsePlaceForm({ label: "Gym", kind: "gym", aliases: "Planet, planet fitness" });
    expect(ok.ok && ok.data.aliases).toEqual(["Planet", "planet fitness"]);
  });
});
