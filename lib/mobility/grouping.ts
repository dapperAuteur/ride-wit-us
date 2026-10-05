/**
 * Trip lists and itineraries: grouping legs under their journey, ordering an itinerary, and the
 * distance a round trip really covers. Pure.
 */
import { subtotalsByCurrency, type CurrencySubtotal, type MoneyLike } from "./money";

export interface TripLike extends MoneyLike {
  id: string;
  journeyId: string | null;
  legOrder: number | null;
  startDate: string;
  departedAt: Date | null;
  distanceM: number | null;
  isRoundTrip: boolean;
}

export interface JourneyLike {
  id: string;
  startDate: string;
}

export interface StayLike extends MoneyLike {
  id: string;
  journeyId: string;
  checkInDate: string;
}

/** Distance actually covered: a round trip is stored one way and counts twice. */
export function effectiveDistanceM(trip: Pick<TripLike, "distanceM" | "isRoundTrip">): number | null {
  if (trip.distanceM == null) return null;
  return trip.isRoundTrip ? trip.distanceM * 2 : trip.distanceM;
}

export function totalDistanceM(trips: readonly Pick<TripLike, "distanceM" | "isRoundTrip">[]): number {
  return trips.reduce((sum, t) => sum + (effectiveDistanceM(t) ?? 0), 0);
}

export type ItineraryEntry<T extends TripLike, S extends StayLike> =
  | { type: "leg"; date: string; leg: T }
  | { type: "stay"; date: string; stay: S };

/**
 * Legs and stays in the order they happen. Sorted by local date; on the same day the legs come
 * first (you travel to the hotel, then check in), legs in departure order, then leg order.
 */
export function buildItinerary<T extends TripLike, S extends StayLike>(
  legs: readonly T[],
  stays: readonly S[]
): ItineraryEntry<T, S>[] {
  const entries: (ItineraryEntry<T, S> & { rank: number; time: number; order: number })[] = [
    ...legs.map((leg) => ({
      type: "leg" as const,
      date: leg.startDate,
      leg,
      rank: 0,
      time: leg.departedAt ? leg.departedAt.getTime() : Number.MAX_SAFE_INTEGER,
      order: leg.legOrder ?? Number.MAX_SAFE_INTEGER,
    })),
    ...stays.map((stay) => ({ type: "stay" as const, date: stay.checkInDate, stay, rank: 1, time: 0, order: 0 })),
  ];
  entries.sort(
    (a, b) => a.date.localeCompare(b.date) || a.rank - b.rank || a.time - b.time || a.order - b.order
  );
  return entries.map((e) => (e.type === "leg" ? { type: "leg", date: e.date, leg: e.leg } : { type: "stay", date: e.date, stay: e.stay }));
}

export type TripListItem<T extends TripLike, J extends JourneyLike, S extends StayLike> =
  | { type: "trip"; date: string; trip: T }
  | { type: "journey"; date: string; journey: J; legs: T[]; stays: S[]; subtotals: CurrencySubtotal[] };

/**
 * The trips page list: standalone trips and journeys (with their legs and stays) newest first. A
 * leg whose journey isn't in `journeys` is shown on its own rather than dropped.
 */
export function groupTripList<T extends TripLike, J extends JourneyLike, S extends StayLike>(
  trips: readonly T[],
  journeys: readonly J[],
  stays: readonly S[]
): TripListItem<T, J, S>[] {
  const byJourney = new Map<string, { legs: T[]; stays: S[] }>(journeys.map((j) => [j.id, { legs: [], stays: [] }]));
  const items: TripListItem<T, J, S>[] = [];
  for (const t of trips) {
    const group = t.journeyId ? byJourney.get(t.journeyId) : undefined;
    if (group) group.legs.push(t);
    else items.push({ type: "trip", date: t.startDate, trip: t });
  }
  for (const s of stays) byJourney.get(s.journeyId)?.stays.push(s);
  for (const j of journeys) {
    const g = byJourney.get(j.id)!;
    const legs = buildItinerary(g.legs, []).map((e) => (e as { leg: T }).leg);
    items.push({ type: "journey", date: j.startDate, journey: j, legs, stays: g.stays, subtotals: subtotalsByCurrency([...g.legs, ...g.stays]) });
  }
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

/** The next leg_order for a journey that already has these legs. */
export function nextLegOrder(legs: readonly Pick<TripLike, "legOrder">[]): number {
  return legs.reduce((max, l) => Math.max(max, l.legOrder ?? -1), -1) + 1;
}
