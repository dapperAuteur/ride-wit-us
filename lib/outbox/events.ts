/**
 * The events RideWitUS sends CentenarianOS about a trip (contract E8 `trip.summary` and E9
 * `cost.recorded`, centenarian-os docs/integrations/ridewitus-contract.md; PRD §6.4 A and E). Pure:
 * a trip in, the events to queue out, so every mapping is tested without a database.
 *
 * Event ids are deterministic per fact (`trip:<uuid>`, `cost:trip:<uuid>`), so a re-send, a resync
 * and a live write all update the same CentenarianOS row.
 *
 * Mappings where RideWitUS's vocabulary is wider than the contract's (both documented here so the
 * CentenarianOS receiver never sees a value it does not list):
 *   mode     `taxi` → `rideshare` (a hired car with a driver; the same CO2 factor in CentenarianOS)
 *   purpose  `personal` → `other` (the contract's list predates `personal`)
 *   vehicle  kind `other` → null
 *
 * Not sent here yet: `trip.plan`, `forecast.item`, `vehicle.snapshot` (need budgets on the emit path
 * and phases 1b and 1c), and lodging-stay costs; see plan 02 phase 2a status.
 */
import { METERS_PER_MILE } from "@/lib/units/convert";
import { CAR_KG_CO2_PER_MILE } from "@/lib/mobility/co2";
import { HUMAN_POWERED_MODES } from "@/lib/mobility/options";
import type { TripMode } from "@/lib/mobility/options";

export const SCHEMA_VERSION = 1;

/** Where each event type goes (lib/outbox/receivers.ts holds the env names). */
export type OutboundReceiver = "centos.mobility_activity" | "centos.mobility_cost";

export interface QueuedEvent {
  receiver: OutboundReceiver;
  eventId: string;
  eventType: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
}

/** The trip columns the events read (a subset of `trips.$inferSelect`). */
export interface TripFacts {
  id: string;
  mode: TripMode;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  category: "travel" | "fitness";
  purpose: string | null;
  startDate: string;
  distanceM: number | null;
  isRoundTrip: boolean;
  durationS: number | null;
  movingTimeS: number | null;
  assistLevel: "none" | "low" | "high" | null;
  caloriesKcal: number | null;
  caloriesSource: "device" | "manual" | null;
  co2Kg: number | null;
  costAmount: string | null;
  costCurrency: string | null;
  /** `migration` = imported from CentenarianOS, which already counts it (loop guard). */
  source: string;
}

export interface VehicleFacts {
  kind: string;
  nickname: string;
}

export interface Emitter {
  witusSub: string;
  /** Demo users never emit (PRD §5.13). */
  isDemo: boolean;
}

const CONTRACT_MODES = new Set([
  "bike",
  "ebike",
  "scooter",
  "walk",
  "run",
  "car",
  "motorcycle",
  "bus",
  "train",
  "plane",
  "ferry",
  "rideshare",
  "other",
]);
const CONTRACT_PURPOSES = new Set(["commute", "leisure", "work", "errand", "exercise", "other"]);
const CONTRACT_VEHICLE_KINDS = new Set(["car", "bike", "ebike", "motorcycle", "scooter", "shoes"]);

export function contractMode(mode: TripMode): string {
  if (mode === "taxi") return "rideshare";
  return CONTRACT_MODES.has(mode) ? mode : "other";
}

export function contractPurpose(purpose: string | null): string | null {
  if (purpose === null) return null;
  return CONTRACT_PURPOSES.has(purpose) ? purpose : "other";
}

export function contractVehicleKind(kind: string | null | undefined): string | null {
  return kind && CONTRACT_VEHICLE_KINDS.has(kind) ? kind : null;
}

const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;

/** Total miles for the trip (a round trip counts both ways), 2 places; null without a distance. */
export function tripMiles(t: Pick<TripFacts, "distanceM" | "isRoundTrip">): number | null {
  if (t.distanceM == null || !(t.distanceM >= 0)) return null;
  return round((t.distanceM / METERS_PER_MILE) * (t.isRoundTrip ? 2 : 1), 2);
}

export const tripEventId = (tripId: string) => `trip:${tripId}`;
export const costEventId = (sourceType: string, sourceId: string) => `cost:${sourceType}:${sourceId}`;

/** E8 `trip.summary` for a trip as it now stands. */
export function tripSummaryPayload(trip: TripFacts, vehicle: VehicleFacts | null, emitter: Emitter, occurredAt: Date): Record<string, unknown> {
  const human = HUMAN_POWERED_MODES.has(trip.mode);
  const miles = tripMiles(trip);
  const activeS = human ? (trip.movingTimeS ?? trip.durationS) : null;
  return {
    event_id: tripEventId(trip.id),
    event_type: "trip.summary",
    schema_version: SCHEMA_VERSION,
    witus_sub: emitter.witusSub,
    occurred_at: occurredAt.toISOString(),
    is_active: true,
    trip_id: trip.id,
    date: trip.startDate,
    mode: contractMode(trip.mode),
    vehicle_kind: contractVehicleKind(vehicle?.kind),
    purpose: contractPurpose(trip.purpose),
    category: trip.category,
    distance_miles: miles,
    duration_min: trip.durationS == null ? null : Math.round(trip.durationS / 60),
    active_minutes: activeS == null ? null : Math.round(activeS / 60),
    calories_kcal: trip.caloriesKcal,
    calories_source: trip.caloriesSource,
    assist_level: trip.mode === "ebike" ? trip.assistLevel : null,
    co2_kg: trip.co2Kg,
    // What driving the same distance would have emitted, with CentenarianOS's car factor.
    co2_avoided_kg: human && miles != null ? round(miles * CAR_KG_CO2_PER_MILE, 3) : null,
    is_human_powered: human,
    status: trip.status,
  };
}

/** The `category_hint` CentenarianOS uses to suggest a budget category for a trip's cost. */
export function tripCostCategoryHint(mode: TripMode): string {
  if (mode === "bike" || mode === "ebike") return "bike";
  if (mode === "bus" || mode === "train" || mode === "ferry") return "transit";
  return "travel";
}

/** E9 `cost.recorded` for a trip's own cost (fare, ticket, rental). */
export function tripCostPayload(trip: TripFacts, vehicle: VehicleFacts | null, emitter: Emitter, occurredAt: Date): Record<string, unknown> {
  return {
    event_id: costEventId("trip", trip.id),
    event_type: "cost.recorded",
    schema_version: SCHEMA_VERSION,
    witus_sub: emitter.witusSub,
    occurred_at: occurredAt.toISOString(),
    is_active: true,
    source_type: "trip",
    source_id: trip.id,
    date: trip.startDate,
    amount: trip.costAmount,
    currency: trip.costCurrency,
    // RideWitUS stores no vendor name (PRD §5.11); CentenarianOS knows its own vendors.
    vendor: null,
    vehicle_label: vehicle?.nickname ?? null,
    category_hint: tripCostCategoryHint(trip.mode),
    work_job_ref: null,
    centos_transaction_id: null,
  };
}

/**
 * A retirement: the last full payload for the fact, with `is_active: false` and a new
 * `occurred_at` (the same shape CentenarianOS's own outbox retires with), so a receiver that checks
 * the type's fields accepts it.
 */
export function retire(payload: Record<string, unknown>, occurredAt: Date): Record<string, unknown> {
  return { ...payload, is_active: false, occurred_at: occurredAt.toISOString() };
}

/**
 * Every event a trip write should queue. `before` is the trip as it was (null on create), `after`
 * as it is now (null on delete). Demo users queue nothing; a trip imported from CentenarianOS
 * queues no `trip.summary` (CentenarianOS already counts it).
 */
export function tripEvents(args: {
  before: TripFacts | null;
  after: TripFacts | null;
  vehicle: VehicleFacts | null;
  emitter: Emitter;
  now: Date;
}): QueuedEvent[] {
  const { before, after, vehicle, emitter, now } = args;
  if (emitter.isDemo) return [];
  const tripId = (after ?? before)?.id;
  if (!tripId) return [];
  const out: QueuedEvent[] = [];

  // trip.summary
  const counted = (t: TripFacts | null) => t !== null && t.source !== "migration";
  if (counted(after)) {
    out.push({
      receiver: "centos.mobility_activity",
      eventId: tripEventId(tripId),
      eventType: "trip.summary",
      occurredAt: now,
      payload: tripSummaryPayload(after!, vehicle, emitter, now),
    });
  } else if (counted(before)) {
    out.push({
      receiver: "centos.mobility_activity",
      eventId: tripEventId(tripId),
      eventType: "trip.summary",
      occurredAt: now,
      payload: retire(tripSummaryPayload(before!, vehicle, emitter, now), now),
    });
  }

  // cost.recorded: sent while the trip has a cost; retired when the cost or the trip goes away.
  const hasCost = (t: TripFacts | null) => t !== null && t.costAmount !== null && t.costCurrency !== null;
  const costId = costEventId("trip", tripId);
  if (hasCost(after)) {
    out.push({
      receiver: "centos.mobility_cost",
      eventId: costId,
      eventType: "cost.recorded",
      occurredAt: now,
      payload: tripCostPayload(after!, vehicle, emitter, now),
    });
  } else if (hasCost(before)) {
    out.push({
      receiver: "centos.mobility_cost",
      eventId: costId,
      eventType: "cost.recorded",
      occurredAt: now,
      payload: retire(tripCostPayload(before!, vehicle, emitter, now), now),
    });
  }
  return out;
}
