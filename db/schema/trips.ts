import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { places } from "./places";
import { users } from "./users";
import { vendorRefs } from "./vendors";
import { tripMode, vehicles } from "./vehicles";

export const tripStatus = pgEnum("trip_status", ["planned", "in_progress", "completed", "cancelled"]);
/** CentenarianOS's existing travel vs fitness distinction (migration 053). */
export const tripCategory = pgEnum("trip_category", ["travel", "fitness"]);
export const tripPurpose = pgEnum("trip_purpose", ["commute", "leisure", "work", "errand", "exercise", "other"]);
export const assistLevel = pgEnum("assist_level", ["none", "low", "high"]);
/** `device` and `manual` only: CentenarianOS computes estimates on receipt (PRD §7.2, §13 Q8). */
export const caloriesSource = pgEnum("calories_source", ["device", "manual"]);
export const distanceSource = pgEnum("distance_source", ["manual", "route", "device", "import"]);
export const recordSource = pgEnum("record_source", [
  "manual",
  "csv_import",
  "garmin_csv",
  "calendar",
  "scan",
  "migration",
  "demo_seed",
]);

/**
 * Every kind of trip: a bike commute, a road trip, a flight, a hotel stay's journey (PRD §5.1, owner
 * answer §13 Q3: all transportation and travel). Itinerary columns port CentenarianOS migration 122
 * and add `flight_number`, which CentenarianOS lacks.
 *
 * Units are canonical (meters, seconds); money is amount + ISO 4217 currency, stored as entered and
 * never converted (PRD §5.7). Check constraints enforce that an amount always has its currency.
 */
export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
    mode: tripMode("mode").notNull(),
    status: tripStatus("status").notNull().default("completed"),
    category: tripCategory("category").notNull().default("travel"),
    purpose: tripPurpose("purpose"),
    /** Free text for now ("business", "personal", ...): CentenarianOS never constrained it. */
    taxCategory: text("tax_category"),

    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    departedAt: timestamp("departed_at", { withTimezone: true }),
    arrivedAt: timestamp("arrived_at", { withTimezone: true }),

    originPlaceId: uuid("origin_place_id").references(() => places.id, { onDelete: "set null" }),
    destinationPlaceId: uuid("destination_place_id").references(() => places.id, { onDelete: "set null" }),
    originLabel: text("origin_label"),
    destinationLabel: text("destination_label"),
    isRoundTrip: boolean("is_round_trip").notNull().default(false),

    distanceM: numeric("distance_m", { precision: 14, scale: 3, mode: "number" }),
    distanceSource: distanceSource("distance_source"),
    durationS: integer("duration_s"),
    /** Human-powered moving time: the basis of active minutes (PRD §5.6). */
    movingTimeS: integer("moving_time_s"),
    assistLevel: assistLevel("assist_level"),
    caloriesKcal: integer("calories_kcal"),
    caloriesSource: caloriesSource("calories_source"),
    co2Kg: numeric("co2_kg", { precision: 10, scale: 3, mode: "number" }),

    costAmount: numeric("cost_amount", { precision: 12, scale: 2 }),
    costCurrency: char("cost_currency", { length: 3 }),
    budgetAmount: numeric("budget_amount", { precision: 12, scale: 2 }),
    budgetCurrency: char("budget_currency", { length: 3 }),

    // Itinerary (flights, lodging, rentals, rail). CentenarianOS migration 122 plus flight_number.
    vendorRefId: uuid("vendor_ref_id").references(() => vendorRefs.id, { onDelete: "set null" }),
    carrierName: text("carrier_name"),
    flightNumber: text("flight_number"),
    confirmationNumber: text("confirmation_number"),
    bookingReference: text("booking_reference"),
    bookingUrl: text("booking_url"),
    seatAssignment: text("seat_assignment"),
    terminal: text("terminal"),
    gate: text("gate"),
    checkInAt: timestamp("check_in_at", { withTimezone: true }),
    checkOutAt: timestamp("check_out_at", { withTimezone: true }),
    accommodationName: text("accommodation_name"),
    accommodationAddress: text("accommodation_address"),
    roomType: text("room_type"),
    pickupAddress: text("pickup_address"),
    pickupAt: timestamp("pickup_at", { withTimezone: true }),
    returnAddress: text("return_address"),
    returnAt: timestamp("return_at", { withTimezone: true }),
    loyaltyProgram: text("loyalty_program"),
    loyaltyNumber: text("loyalty_number"),
    packingNotes: text("packing_notes"),
    notes: text("notes"),

    source: recordSource("source").notNull().default("manual"),
    /** Dedup key for imports, for example a Garmin activity id (PRD §5.1). */
    externalId: text("external_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("trips_user_date_idx").on(t.userId, t.startDate),
    index("trips_vehicle_idx").on(t.vehicleId),
    unique("trips_user_source_external_key").on(t.userId, t.source, t.externalId),
    check(
      "trips_cost_currency_paired",
      sql`(${t.costAmount} IS NULL) = (${t.costCurrency} IS NULL) AND (${t.costCurrency} IS NULL OR ${t.costCurrency} ~ '^[A-Z]{3}$')`
    ),
    check(
      "trips_budget_currency_paired",
      sql`(${t.budgetAmount} IS NULL) = (${t.budgetCurrency} IS NULL) AND (${t.budgetCurrency} IS NULL OR ${t.budgetCurrency} ~ '^[A-Z]{3}$')`
    ),
    check("trips_end_after_start", sql`${t.endDate} IS NULL OR ${t.endDate} >= ${t.startDate}`),
    check("trips_distance_nonnegative", sql`${t.distanceM} IS NULL OR ${t.distanceM} >= 0`),
    check("trips_assist_ebike_only", sql`${t.assistLevel} IS NULL OR ${t.mode} = 'ebike'`),
    check("trips_calories_source_paired", sql`(${t.caloriesKcal} IS NULL) = (${t.caloriesSource} IS NULL)`),
  ]
);
