/**
 * Glue between the trip actions and the outbox: read what the events need, build them, and hand
 * back the queue statement to batch with the write, plus the after-response drain.
 */
import "server-only";
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { getDb } from "@/db";
import { trips, vehicles } from "@/db/schema";
import { databaseConfigured } from "@/lib/db/config";
import type { TripMode } from "@/lib/mobility/options";
import { drainOutbox } from "./drain";
import { enqueueStatement } from "./enqueue";
import { tripEvents, type Emitter, type TripFacts, type VehicleFacts } from "./events";
import { drizzleOutboxStore } from "./store";

type TripRow = typeof trips.$inferSelect;

/** The event-relevant columns of a trip row (or of the values about to be written). */
export function tripFactsOf(row: Pick<TripRow, "id" | "mode" | "status" | "category" | "purpose" | "startDate" | "distanceM" | "isRoundTrip" | "durationS" | "movingTimeS" | "assistLevel" | "caloriesKcal" | "caloriesSource" | "co2Kg" | "costAmount" | "costCurrency" | "source">): TripFacts {
  return {
    id: row.id,
    mode: row.mode as TripMode,
    status: row.status,
    category: row.category,
    purpose: row.purpose,
    startDate: row.startDate,
    distanceM: row.distanceM,
    isRoundTrip: row.isRoundTrip,
    durationS: row.durationS,
    movingTimeS: row.movingTimeS,
    assistLevel: row.assistLevel,
    caloriesKcal: row.caloriesKcal,
    caloriesSource: row.caloriesSource,
    co2Kg: row.co2Kg,
    costAmount: row.costAmount,
    costCurrency: row.costCurrency,
    source: row.source,
  };
}

/** One of the user's trips, whole, or null. */
export async function loadTrip(db: Db, userId: string, id: string): Promise<TripRow | null> {
  const [row] = await db.select().from(trips).where(and(eq(trips.id, id), eq(trips.userId, userId))).limit(1);
  return row ?? null;
}

export async function loadVehicleFacts(db: Db, userId: string, vehicleId: string | null): Promise<VehicleFacts | null> {
  if (!vehicleId) return null;
  const [v] = await db
    .select({ kind: vehicles.kind, nickname: vehicles.nickname })
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, userId)))
    .limit(1);
  return v ?? null;
}

/**
 * The queue statement for a trip write, wrapped in `{ statement }` (null when nothing is emitted:
 * demo user, no change). WRAPPED ON PURPOSE: a Drizzle query is a thenable, and an async function
 * that returned it bare would run it on its own, outside the caller's batch and transaction.
 */
export async function tripQueueStatement(
  db: Db,
  args: { userId: string; emitter: Emitter; before: TripFacts | null; after: TripFacts | null; vehicleId: string | null; now?: Date }
): Promise<{ statement: NonNullable<ReturnType<typeof enqueueStatement>> } | null> {
  if (args.emitter.isDemo) return null;
  const vehicle = await loadVehicleFacts(db, args.userId, args.vehicleId);
  const events = tripEvents({ before: args.before, after: args.after, vehicle, emitter: args.emitter, now: args.now ?? new Date() });
  const statement = enqueueStatement(db, args.userId, events);
  return statement ? { statement } : null;
}

/** Send this user's due events now (run after the response; the cron catches anything missed). */
export async function drainForUser(userId: string): Promise<void> {
  if (!databaseConfigured()) return;
  try {
    await drainOutbox(drizzleOutboxStore(getDb()), { userId });
  } catch (err) {
    console.error("[outbox] drain after write failed err=%s", err instanceof Error ? err.name : "error");
  }
}
