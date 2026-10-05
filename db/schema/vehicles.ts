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
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/** CentenarianOS vehicle types (migrations 052, 129) that are things a person owns or uses. */
export const vehicleKind = pgEnum("vehicle_kind", [
  "car",
  "bike",
  "ebike",
  "motorcycle",
  "scooter",
  "shoes",
  "other",
]);
export const vehicleOwnership = pgEnum("vehicle_ownership", ["owned", "rental", "borrowed"]);
export const vehicleEnergy = pgEnum("vehicle_energy", [
  "gasoline",
  "diesel",
  "electric",
  "hybrid",
  "plug_in_hybrid",
  "human",
]);

/**
 * Trip modes: CentenarianOS's list (migration 052) plus `ebike` and `scooter` as modes (PRD §5.1)
 * and `taxi`. Shared with trips.ts, defined here so vehicles can carry a default mode.
 */
export const tripMode = pgEnum("trip_mode", [
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
  "taxi",
  "other",
]);

/**
 * A vehicle, bike, or pair of shoes. Distances are canonical meters (PRD §5.9); money is an amount
 * plus its ISO 4217 currency, never converted (PRD §5.7). Depreciation inputs exist for every kind,
 * shoes and bikes included (PRD §5.5, owner answer §13 Q10).
 */
export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: vehicleKind("kind").notNull(),
    nickname: text("nickname").notNull(),
    make: text("make"),
    model: text("model"),
    year: integer("year"),
    color: text("color"),
    ownership: vehicleOwnership("ownership").notNull().default("owned"),
    energy: vehicleEnergy("energy"),
    defaultTripMode: tripMode("default_trip_mode"),
    /**
     * Manual odometer correction in meters, added to the sum of logged trips for bikes and shoes
     * (which have no odometer, PRD §5.2) or used as the starting reading for a car.
     */
    odometerOffsetM: numeric("odometer_offset_m", { precision: 14, scale: 3, mode: "number" }),
    purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }),
    purchaseCurrency: char("purchase_currency", { length: 3 }),
    purchaseDate: date("purchase_date"),
    expectedLifeYears: numeric("expected_life_years", { precision: 5, scale: 2, mode: "number" }),
    expectedLifeM: numeric("expected_life_m", { precision: 14, scale: 3, mode: "number" }),
    salvageValue: numeric("salvage_value", { precision: 12, scale: 2 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vehicles_user_idx").on(t.userId),
    check(
      "vehicles_purchase_currency_paired",
      sql`(${t.purchasePrice} IS NULL AND ${t.salvageValue} IS NULL) OR ${t.purchaseCurrency} ~ '^[A-Z]{3}$'`
    ),
    check("vehicles_year_range", sql`${t.year} IS NULL OR ${t.year} BETWEEN 1885 AND 2100`),
  ]
);
