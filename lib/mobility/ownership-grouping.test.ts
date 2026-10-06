import { describe, expect, it } from "vitest";
import { buildItinerary, effectiveDistanceM, groupTripList, nextLegOrder, totalDistanceM, type TripLike } from "./grouping";
import { verifyOwnedRefs, type OwnedIdLoader, type RefKind } from "./ownership";

const MINE = {
  vehicle: "11111111-1111-4111-8111-111111111111",
  place: "22222222-2222-4222-8222-222222222222",
  journey: "33333333-3333-4333-8333-333333333333",
};
const THEIRS = {
  vehicle: "44444444-4444-4444-8444-444444444444",
  place: "55555555-5555-4555-8555-555555555555",
};

/** A fake database: the current owner owns only the MINE ids. */
function fakeLoader(calls: { kind: RefKind; ids: string[] }[] = []): OwnedIdLoader {
  return async (kind, ids) => {
    calls.push({ kind, ids });
    return new Set(ids.filter((id) => id === MINE[kind]));
  };
}

describe("ownership guard", () => {
  it("accepts the owner's own vehicle, places and journey", async () => {
    const r = await verifyOwnedRefs(
      { vehicle: [MINE.vehicle], place: [MINE.place, MINE.place, null], journey: [MINE.journey] },
      fakeLoader()
    );
    expect(r).toEqual({ ok: true });
  });

  it("refuses another user's vehicle id", async () => {
    const r = await verifyOwnedRefs({ vehicle: [THEIRS.vehicle] }, fakeLoader());
    expect(r).toEqual({ ok: false, kind: "vehicle", id: THEIRS.vehicle });
  });

  it("refuses another user's place even when the other end is the owner's", async () => {
    const r = await verifyOwnedRefs({ place: [MINE.place, THEIRS.place] }, fakeLoader());
    expect(r).toEqual({ ok: false, kind: "place", id: THEIRS.place });
  });

  it("refuses a malformed id without querying", async () => {
    const calls: { kind: RefKind; ids: string[] }[] = [];
    const r = await verifyOwnedRefs({ journey: ["not-an-id"] }, fakeLoader(calls));
    expect(r.ok).toBe(false);
    expect(calls).toEqual([]);
  });

  it("skips the database when nothing is referenced", async () => {
    const calls: { kind: RefKind; ids: string[] }[] = [];
    expect(await verifyOwnedRefs({ vehicle: [null], place: [undefined, ""] }, fakeLoader(calls))).toEqual({ ok: true });
    expect(calls).toEqual([]);
  });
});

function trip(p: Partial<TripLike> & { id: string; startDate: string }): TripLike {
  return {
    journeyId: null,
    legOrder: null,
    departedAt: null,
    distanceM: null,
    isRoundTrip: false,
    costAmount: null,
    costCurrency: null,
    ...p,
  };
}

describe("round trips", () => {
  it("count twice the stored one-way distance", () => {
    expect(effectiveDistanceM({ distanceM: 5000, isRoundTrip: true })).toBe(10_000);
    expect(effectiveDistanceM({ distanceM: null, isRoundTrip: true })).toBeNull();
    expect(totalDistanceM([{ distanceM: 1000, isRoundTrip: false }, { distanceM: 1000, isRoundTrip: true }, { distanceM: null, isRoundTrip: false }])).toBe(3000);
  });
});

describe("itinerary", () => {
  it("orders legs and stays as they happen", () => {
    const out = trip({ id: "out", journeyId: "j", startDate: "2026-10-09", departedAt: new Date("2026-10-09T13:10:00Z"), legOrder: 0 });
    const cab = trip({ id: "cab", journeyId: "j", startDate: "2026-10-09", departedAt: new Date("2026-10-09T16:30:00Z"), legOrder: 1 });
    const back = trip({ id: "back", journeyId: "j", startDate: "2026-10-12", legOrder: 2 });
    const hotel = { id: "hotel", journeyId: "j", checkInDate: "2026-10-09", costAmount: "600", costCurrency: "USD" };
    const order = buildItinerary([back, cab, out], [hotel]).map((e) => (e.type === "leg" ? e.leg.id : e.stay.id));
    expect(order).toEqual(["out", "cab", "hotel", "back"]);
  });

  it("falls back to leg order when there are no times", () => {
    const a = trip({ id: "a", startDate: "2026-10-09", legOrder: 1 });
    const b = trip({ id: "b", startDate: "2026-10-09", legOrder: 0 });
    expect(buildItinerary([a, b], []).map((e) => (e.type === "leg" ? e.leg.id : ""))).toEqual(["b", "a"]);
  });

  it("numbers the next leg after the highest", () => {
    expect(nextLegOrder([])).toBe(0);
    expect(nextLegOrder([{ legOrder: 0 }, { legOrder: 4 }, { legOrder: null }])).toBe(5);
  });
});

describe("trip list grouping", () => {
  it("puts legs and stays under their journey with per-currency subtotals, newest first", () => {
    const journey = { id: "j", startDate: "2026-10-09", name: "Mexico City" };
    const items = groupTripList(
      [
        trip({ id: "commute", startDate: "2026-10-14", costAmount: "2.50", costCurrency: "USD" }),
        trip({ id: "flight", journeyId: "j", startDate: "2026-10-09", legOrder: 0, costAmount: "412.10", costCurrency: "USD" }),
        trip({ id: "metro", journeyId: "j", startDate: "2026-10-10", legOrder: 1, costAmount: "5", costCurrency: "MXN" }),
        trip({ id: "old", startDate: "2026-09-01" }),
      ],
      [journey],
      [{ id: "s", journeyId: "j", checkInDate: "2026-10-09", costAmount: "1845", costCurrency: "MXN" }]
    );
    expect(items.map((i) => (i.type === "trip" ? i.trip.id : i.journey.id))).toEqual(["commute", "j", "old"]);
    const j = items[1];
    expect(j.type).toBe("journey");
    if (j.type === "journey") {
      expect(j.legs.map((l) => l.id)).toEqual(["flight", "metro"]);
      expect(j.stays.map((s) => s.id)).toEqual(["s"]);
      expect(j.subtotals.map((s) => [s.currency, s.cents])).toEqual([
        ["MXN", 185000],
        ["USD", 41210],
      ]);
    }
  });

  it("shows a leg on its own when its journey isn't listed", () => {
    const items = groupTripList([trip({ id: "orphan", journeyId: "gone", startDate: "2026-10-01" })], [], []);
    expect(items).toEqual([expect.objectContaining({ type: "trip" })]);
  });
});
