import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { journeys, lodgingStays, places, trips, vehicles } from "@/db/schema";
import { isUuid } from "./form-kit";

/**
 * Owner-scoped reads for the mobility screens. Every query filters on user_id; a lookup by id
 * also requires the id to be well-formed, so a hand-typed URL gets "not found" instead of a
 * database error.
 */

export type VehicleRow = typeof vehicles.$inferSelect;
export type PlaceRow = typeof places.$inferSelect;
export type TripRow = typeof trips.$inferSelect;
export type JourneyRow = typeof journeys.$inferSelect;
export type StayRow = typeof lodgingStays.$inferSelect;

export function listVehicles(userId: string): Promise<VehicleRow[]> {
  return getDb()
    .select()
    .from(vehicles)
    .where(eq(vehicles.userId, userId))
    .orderBy(desc(vehicles.isActive), asc(vehicles.nickname));
}

export async function getVehicle(userId: string, id: string): Promise<VehicleRow | null> {
  if (!isUuid(id)) return null;
  const [row] = await getDb().select().from(vehicles).where(and(eq(vehicles.id, id), eq(vehicles.userId, userId))).limit(1);
  return row ?? null;
}

/**
 * Distance logged on each vehicle by completed trips, round trips counted twice. Bikes and shoes
 * have no odometer, so this is their mileage (PRD §5.2).
 */
export async function vehicleDistanceTotals(userId: string): Promise<Map<string, number>> {
  const rows = await getDb()
    .select({
      vehicleId: trips.vehicleId,
      meters: sql<string | null>`sum(case when ${trips.isRoundTrip} then ${trips.distanceM} * 2 else ${trips.distanceM} end)`,
    })
    .from(trips)
    .where(and(eq(trips.userId, userId), eq(trips.status, "completed"), isNotNull(trips.vehicleId)))
    .groupBy(trips.vehicleId);
  return new Map(rows.filter((r) => r.vehicleId).map((r) => [r.vehicleId as string, Number(r.meters ?? 0)]));
}

export function listPlaces(userId: string): Promise<PlaceRow[]> {
  return getDb().select().from(places).where(eq(places.userId, userId)).orderBy(asc(places.kind), asc(places.label));
}

export async function getPlace(userId: string, id: string): Promise<PlaceRow | null> {
  if (!isUuid(id)) return null;
  const [row] = await getDb().select().from(places).where(and(eq(places.id, id), eq(places.userId, userId))).limit(1);
  return row ?? null;
}

export async function getTrip(userId: string, id: string): Promise<TripRow | null> {
  if (!isUuid(id)) return null;
  const [row] = await getDb().select().from(trips).where(and(eq(trips.id, id), eq(trips.userId, userId))).limit(1);
  return row ?? null;
}

export async function getJourney(
  userId: string,
  id: string
): Promise<{ journey: JourneyRow; legs: TripRow[]; stays: StayRow[] } | null> {
  if (!isUuid(id)) return null;
  const db = getDb();
  const [journey] = await db.select().from(journeys).where(and(eq(journeys.id, id), eq(journeys.userId, userId))).limit(1);
  if (!journey) return null;
  const [legs, stays] = await Promise.all([
    db.select().from(trips).where(and(eq(trips.journeyId, id), eq(trips.userId, userId))),
    db.select().from(lodgingStays).where(and(eq(lodgingStays.journeyId, id), eq(lodgingStays.userId, userId))),
  ]);
  return { journey, legs, stays };
}

export async function getStay(userId: string, id: string): Promise<StayRow | null> {
  if (!isUuid(id)) return null;
  const [row] = await getDb()
    .select()
    .from(lodgingStays)
    .where(and(eq(lodgingStays.id, id), eq(lodgingStays.userId, userId)))
    .limit(1);
  return row ?? null;
}

export type TripFilter = "all" | "planned" | "done";

export const TRIP_FILTERS: readonly TripFilter[] = ["all", "planned", "done"];

function statusWhere<T extends typeof trips.status | typeof journeys.status>(column: T, filter: TripFilter): SQL | undefined {
  if (filter === "planned") return inArray(column, ["planned", "in_progress"]);
  if (filter === "done") return eq(column, "completed");
  return undefined;
}

const LIST_LIMIT = 200;

/** Standalone trips plus journeys (with their legs and stays) for the trips page. */
export async function listTripsPage(userId: string, filter: TripFilter) {
  const db = getDb();
  const [standalone, journeyRows] = await Promise.all([
    db
      .select()
      .from(trips)
      .where(and(eq(trips.userId, userId), isNull(trips.journeyId), statusWhere(trips.status, filter)))
      .orderBy(desc(trips.startDate), desc(trips.createdAt))
      .limit(LIST_LIMIT),
    db
      .select()
      .from(journeys)
      .where(and(eq(journeys.userId, userId), statusWhere(journeys.status, filter)))
      .orderBy(desc(journeys.startDate))
      .limit(LIST_LIMIT),
  ]);
  const ids = journeyRows.map((j) => j.id);
  const [legs, stays] = ids.length
    ? await Promise.all([
        db.select().from(trips).where(and(eq(trips.userId, userId), inArray(trips.journeyId, ids))),
        db.select().from(lodgingStays).where(and(eq(lodgingStays.userId, userId), inArray(lodgingStays.journeyId, ids))),
      ])
    : [[], []];
  return { trips: [...standalone, ...legs], journeys: journeyRows, stays, truncated: standalone.length === LIST_LIMIT };
}
