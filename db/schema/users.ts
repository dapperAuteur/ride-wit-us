import { sql } from "drizzle-orm";
import { boolean, char, check, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Who may use the mobility app. The owner is decided by ADMIN_EMAIL at request time
 * (lib/mobility/access.ts); the stored value records it, it does not grant it.
 */
export const userAccess = pgEnum("user_access", ["owner", "member", "waitlisted"]);
// Mirrors UnitSystem in lib/units/convert.ts (kept literal so drizzle-kit needs no path aliases;
// db/schema/schema.test.ts asserts the two agree).
export const unitSystem = pgEnum("unit_system", ["metric", "imperial"]);

/**
 * One row per WitUS identity. Keyed by the IdP subject (`witus_sub`), never by email: an email can
 * change at the IdP, the subject cannot (PRD §6.3).
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  witusSub: text("witus_sub").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  access: userAccess("access").notNull().default("waitlisted"),
  /** Demo users (PRD §5.13) never emit events to siblings and are wiped by the nightly reset. */
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

/**
 * Per-user defaults. `unit_system` is the saved default; each page's toggle shows the other system
 * without writing here (PRD §5.9). `home_currency` only pre-fills new costs: RideWitUS stores every
 * amount with its own currency and never converts (PRD §5.7). Null until the user picks one.
 */
export const userSettings = pgTable(
  "user_settings",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    unitSystem: unitSystem("unit_system").notNull().default("imperial"),
    homeCurrency: char("home_currency", { length: 3 }),
    /** IANA zone, for example "America/Chicago". Null = use the browser's. */
    timeZone: text("time_zone"),
    /** No FK: vehicles references users, and a cycle here would complicate the demo reset. */
    defaultVehicleId: uuid("default_vehicle_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("user_settings_home_currency_format", sql`${t.homeCurrency} ~ '^[A-Z]{3}$'`)]
);
