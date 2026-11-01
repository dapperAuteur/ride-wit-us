import { sql } from "drizzle-orm";
import { boolean, char, check, date, index, jsonb, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Projections of facts CentenarianOS owns, filled by its signed events (CentenarianOS plan 70 R-3,
 * contract E5 to E7: centenarian-os docs/integrations/ridewitus-contract.md). Each table keeps the
 * LATEST state per `(user_id, event_id)`, not a ledger:
 *
 *   - A newer `occurred_at` replaces the row; an equal one replaces it too (last write wins); an
 *     older one is accepted and ignored (lib/events/projections.ts, the upsert's WHERE clause).
 *   - `is_active = false` retires the row but keeps it, so a late, older copy of the fact cannot
 *     bring it back. Readers filter on `is_active`.
 *
 * Money stays as sent (decimal + ISO 4217) and is never converted (PRD §5.7). No coordinates, no
 * descriptions, no transactions (contract §1 "Privacy").
 */

const timestamps = {
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
};

/** E5 `envelope.balance`: a CentenarianOS savings goal linked to a trip or equipment (later a vehicle). */
export const envelopeBalances = pgTable(
  "envelope_balances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** `envelope:<envelope_id>`. */
    eventId: text("event_id").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    /** CentenarianOS savings goal id. */
    envelopeId: text("envelope_id").notNull(),
    /** `trip` or `equipment` today, `vehicle` after Stage 4. Text, so a new kind needs no migration. */
    linkType: text("link_type"),
    /** The linked thing's id: a CentenarianOS id now, the same id in RideWitUS after the Stage 4 import. */
    linkId: text("link_id"),
    linkSource: text("link_source"),
    label: text("label").notNull(),
    goalKind: text("goal_kind"),
    balance: numeric("balance", { precision: 14, scale: 2 }).notNull(),
    targetAmount: numeric("target_amount", { precision: 14, scale: 2 }),
    targetDate: date("target_date"),
    currency: char("currency", { length: 3 }).notNull(),
    status: text("status"),
    asOf: timestamp("as_of", { withTimezone: true }),
    deepLink: text("deep_link"),
    ...timestamps,
  },
  (t) => [
    unique("envelope_balances_user_event_key").on(t.userId, t.eventId),
    index("envelope_balances_user_link_idx").on(t.userId, t.linkType, t.linkId),
    check("envelope_balances_currency_format", sql`${t.currency} ~ '^[A-Z]{3}$'`),
  ]
);

/**
 * E6 `calendar.activity`: an event from a calendar the user chose to share from CentenarianOS (titles
 * may arrive as "Event" when hidden). A retraction (`is_active: false`) arrives with every detail
 * null, so every detail column is nullable. Suggested trips (phase 2c, R-5) are built from these.
 */
export const calendarActivities = pgTable(
  "calendar_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** `cal:<sha256 of CentenarianOS calendar_sync_items.id>`. */
    eventId: text("event_id").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    allDay: boolean("all_day"),
    timeZone: text("time_zone"),
    title: text("title"),
    /** Free text as typed in the calendar; matched to saved places in 2c. */
    location: text("location"),
    calendarLabel: text("calendar_label"),
    /** `confirmed` or `cancelled`. */
    status: text("status"),
    /** The parsed `#trip` token: `{ distance_miles, mode, duration_min }`, or null. */
    tripToken: jsonb("trip_token"),
    ...timestamps,
  },
  (t) => [
    unique("calendar_activities_user_event_key").on(t.userId, t.eventId),
    index("calendar_activities_user_starts_idx").on(t.userId, t.startsAt),
  ]
);

/**
 * E7 `cost.matched`: CentenarianOS matched (or unmatched) one of our `cost.recorded` items to a
 * bank or card transaction. A reference only: amount, currency, date and a link, never the
 * transaction itself.
 */
export const financeMatches = pgTable(
  "finance_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** `match:<source_type>:<source_id>`. */
    eventId: text("event_id").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    /** `fuel`, `maintenance`, `component`, `trip` (PRD §6.4 E). */
    sourceType: text("source_type").notNull(),
    /** The RideWitUS id of the cost (a trip, fuel log, ...). */
    sourceId: text("source_id").notNull(),
    matched: boolean("matched").notNull(),
    transactionAmount: numeric("transaction_amount", { precision: 14, scale: 2 }),
    transactionCurrency: char("transaction_currency", { length: 3 }),
    transactionDate: date("transaction_date"),
    deepLink: text("deep_link"),
    ...timestamps,
  },
  (t) => [
    unique("finance_matches_user_event_key").on(t.userId, t.eventId),
    index("finance_matches_user_source_idx").on(t.userId, t.sourceType, t.sourceId),
    check(
      "finance_matches_currency_format",
      sql`${t.transactionCurrency} IS NULL OR ${t.transactionCurrency} ~ '^[A-Z]{3}$'`
    ),
  ]
);
