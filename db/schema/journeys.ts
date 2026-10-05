import { sql } from "drizzle-orm";
import { char, check, date, index, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { places } from "./places";
import { users } from "./users";

/**
 * Shared by trips and journeys. Defined here (not in trips.ts) so trips.ts can reference journeys
 * without an import cycle. The SQL type is unchanged from migration 0000.
 */
export const tripStatus = pgEnum("trip_status", ["planned", "in_progress", "completed", "cancelled"]);

/**
 * A multi-leg trip: a weekend away with a flight out, a train back, and a hotel in between
 * (PRD §5.1, owner answer §13 Q3). Ports CentenarianOS's `trip_routes` parent. The legs are `trips`
 * rows with `journey_id` set; lodging is `lodging_stays`. Costs live on the legs and stays, each
 * with its own currency, so a journey has no cost column of its own (PRD §5.7).
 */
export const journeys = pgTable(
  "journeys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: tripStatus("status").notNull().default("planned"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    packingNotes: text("packing_notes"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("journeys_user_date_idx").on(t.userId, t.startDate),
    check("journeys_end_after_start", sql`${t.endDate} IS NULL OR ${t.endDate} >= ${t.startDate}`),
  ]
);

/**
 * A lodging stay inside a journey: check-in and check-out dates, where, and what it cost in the
 * currency it was paid in. CentenarianOS stored a hotel as a trip leg with accommodation columns;
 * the Stage 4 migration maps those legs to stays.
 */
export const lodgingStays = pgTable(
  "lodging_stays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    journeyId: uuid("journey_id")
      .notNull()
      .references(() => journeys.id, { onDelete: "cascade" }),
    placeId: uuid("place_id").references(() => places.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    address: text("address"),
    checkInDate: date("check_in_date").notNull(),
    checkOutDate: date("check_out_date").notNull(),
    /** Stored as the user typed it: it is their booking, shown back only to them. */
    confirmationNumber: text("confirmation_number"),
    roomType: text("room_type"),
    costAmount: numeric("cost_amount", { precision: 12, scale: 2 }),
    costCurrency: char("cost_currency", { length: 3 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("lodging_stays_journey_idx").on(t.journeyId),
    index("lodging_stays_user_idx").on(t.userId),
    check("lodging_stays_checkout_after_checkin", sql`${t.checkOutDate} >= ${t.checkInDate}`),
    check(
      "lodging_stays_cost_currency_paired",
      sql`(${t.costAmount} IS NULL) = (${t.costCurrency} IS NULL) AND (${t.costCurrency} IS NULL OR ${t.costCurrency} ~ '^[A-Z]{3}$')`
    ),
  ]
);
