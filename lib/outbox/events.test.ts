import { describe, expect, it } from "vitest";
import { contractMode, contractPurpose, contractVehicleKind, tripEvents, tripMiles, tripSummaryPayload, type TripFacts } from "./events";

const NOW = new Date("2026-10-31T13:00:00.000Z");
const EMITTER = { witusSub: "SUB_EXAMPLE", isDemo: false };
const BIKE = { kind: "bike", nickname: "Brompton" };

const trip = (over: Partial<TripFacts> = {}): TripFacts => ({
  id: "TRIP_1",
  mode: "bike",
  status: "completed",
  category: "fitness",
  purpose: "commute",
  startDate: "2026-10-31",
  distanceM: 9978.0352, // 6.2 miles
  isRoundTrip: false,
  durationS: 34 * 60,
  movingTimeS: 31 * 60,
  assistLevel: null,
  caloriesKcal: null,
  caloriesSource: null,
  co2Kg: 0,
  costAmount: null,
  costCurrency: null,
  source: "manual",
  ...over,
});

describe("trip.summary payload (contract E8)", () => {
  it("matches the contract's example field for field", () => {
    expect(tripSummaryPayload(trip(), BIKE, EMITTER, NOW)).toEqual({
      event_id: "trip:TRIP_1",
      event_type: "trip.summary",
      schema_version: 1,
      witus_sub: "SUB_EXAMPLE",
      occurred_at: "2026-10-31T13:00:00.000Z",
      is_active: true,
      trip_id: "TRIP_1",
      date: "2026-10-31",
      mode: "bike",
      vehicle_kind: "bike",
      purpose: "commute",
      category: "fitness",
      distance_miles: 6.2,
      duration_min: 34,
      active_minutes: 31,
      calories_kcal: null,
      calories_source: null,
      assist_level: null,
      co2_kg: 0,
      co2_avoided_kg: 1.054,
      is_human_powered: true,
      status: "completed",
    });
  });

  it("counts a round trip both ways and gives motorized trips no active minutes or avoided CO2", () => {
    const p = tripSummaryPayload(trip({ mode: "car", isRoundTrip: true, category: "travel", co2Kg: 2.108 }), { kind: "car", nickname: "Civic" }, EMITTER, NOW);
    expect(p).toMatchObject({ distance_miles: 12.4, active_minutes: null, co2_avoided_kg: null, is_human_powered: false, vehicle_kind: "car" });
  });

  it("uses total time for active minutes when no moving time was logged, and sends assist level for e-bikes only", () => {
    expect(tripSummaryPayload(trip({ movingTimeS: null }), null, EMITTER, NOW).active_minutes).toBe(34);
    expect(tripSummaryPayload(trip({ mode: "ebike", assistLevel: "low" }), null, EMITTER, NOW).assist_level).toBe("low");
    expect(tripSummaryPayload(trip({ mode: "bike", assistLevel: "low" }), null, EMITTER, NOW).assist_level).toBeNull();
  });

  it("maps values outside the contract's lists", () => {
    expect(contractMode("taxi")).toBe("rideshare");
    expect(contractMode("plane")).toBe("plane");
    expect(contractPurpose("personal")).toBe("other");
    expect(contractPurpose(null)).toBeNull();
    expect(contractVehicleKind("other")).toBeNull();
    expect(contractVehicleKind("shoes")).toBe("shoes");
  });

  it("has no distance without one", () => {
    expect(tripMiles({ distanceM: null, isRoundTrip: true })).toBeNull();
  });
});

describe("tripEvents", () => {
  it("queues trip.summary on create, and cost.recorded when the trip has a cost", () => {
    const none = tripEvents({ before: null, after: trip(), vehicle: BIKE, emitter: EMITTER, now: NOW });
    expect(none.map((e) => [e.receiver, e.eventId])).toEqual([["centos.mobility_activity", "trip:TRIP_1"]]);

    const paid = tripEvents({ before: null, after: trip({ mode: "train", costAmount: "12.00", costCurrency: "EUR" }), vehicle: null, emitter: EMITTER, now: NOW });
    expect(paid.map((e) => e.eventId)).toEqual(["trip:TRIP_1", "cost:trip:TRIP_1"]);
    expect(paid[1]).toMatchObject({ receiver: "centos.mobility_cost", eventType: "cost.recorded" });
    expect(paid[1].payload).toMatchObject({
      event_id: "cost:trip:TRIP_1",
      source_type: "trip",
      source_id: "TRIP_1",
      date: "2026-10-31",
      amount: "12.00",
      currency: "EUR",
      vendor: null,
      category_hint: "transit",
      work_job_ref: null,
      centos_transaction_id: null,
      is_active: true,
    });
  });

  it("retires both on delete, with the last full payload and is_active false", () => {
    const before = trip({ costAmount: "5.00", costCurrency: "USD" });
    const out = tripEvents({ before, after: null, vehicle: BIKE, emitter: EMITTER, now: NOW });
    expect(out.map((e) => e.eventId)).toEqual(["trip:TRIP_1", "cost:trip:TRIP_1"]);
    for (const e of out) expect(e.payload.is_active).toBe(false);
    expect(out[0].payload).toMatchObject({ trip_id: "TRIP_1", mode: "bike", distance_miles: 6.2 });
    expect(out[1].payload).toMatchObject({ amount: "5.00", currency: "USD" });
  });

  it("retires cost.recorded when an edit removes the cost, and keeps sending trip.summary", () => {
    const out = tripEvents({ before: trip({ costAmount: "5.00", costCurrency: "USD" }), after: trip(), vehicle: BIKE, emitter: EMITTER, now: NOW });
    expect(out.map((e) => [e.eventId, e.payload.is_active])).toEqual([
      ["trip:TRIP_1", true],
      ["cost:trip:TRIP_1", false],
    ]);
  });

  it("queues nothing for a demo user", () => {
    expect(tripEvents({ before: null, after: trip({ costAmount: "1.00", costCurrency: "USD" }), vehicle: null, emitter: { ...EMITTER, isDemo: true }, now: NOW })).toEqual([]);
  });

  it("never sends trip.summary for a trip imported from CentenarianOS (loop guard), but still its cost", () => {
    const out = tripEvents({ before: null, after: trip({ source: "migration", costAmount: "3.00", costCurrency: "USD" }), vehicle: null, emitter: EMITTER, now: NOW });
    expect(out.map((e) => e.eventId)).toEqual(["cost:trip:TRIP_1"]);
  });

  it("uses deterministic ids, so the same trip always names the same rows", () => {
    const a = tripEvents({ before: null, after: trip(), vehicle: null, emitter: EMITTER, now: NOW });
    const b = tripEvents({ before: trip(), after: trip({ distanceM: 1000 }), vehicle: null, emitter: EMITTER, now: new Date(NOW.getTime() + 1000) });
    expect(a[0].eventId).toBe(b[0].eventId);
  });
});
