/**
 * The three projections CentenarianOS fills (contract E5 to E7): how each event type is checked,
 * the row it becomes, and the Drizzle writer that keeps the latest state.
 *
 * THE ORDERING RULE lives in SQL, in one place (`upsertLatest`):
 *   INSERT ... ON CONFLICT (user_id, event_id) DO UPDATE SET <every column> = excluded.<column>
 *   WHERE <table>.occurred_at <= excluded.occurred_at
 * so a newer or equal `occurred_at` replaces the row and an older one changes nothing, and the
 * request still answers it as accepted (contract §1 "Idempotency key").
 */
import "server-only";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { inArray, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db";
import { calendarActivities, envelopeBalances, financeMatches, users } from "@/db/schema";
import {
  checkEventId,
  failField,
  fields,
  needBoolean,
  needCurrency,
  needDecimal,
  needText,
  optBoolean,
  optCurrency,
  optDecimal,
  optHttpUrl,
  optIsoDate,
  optText,
  optTimestamp,
  type EventTypeSpec,
  type ProjectionWriter,
} from "./inbound";

// ---------------------------------------------------------------------------------------------
// E5 envelope.balance → envelope_balances
// ---------------------------------------------------------------------------------------------

export type EnvelopeRow = typeof envelopeBalances.$inferInsert;

export const envelopeBalanceSpec: EventTypeSpec<
  Omit<EnvelopeRow, "userId" | "eventId" | "isActive" | "occurredAt" | "id" | "receivedAt">,
  EnvelopeRow
> = {
  receiver: "envelopeBalance",
  eventType: "envelope.balance",
  parse: (raw, common) =>
    fields(() => {
      const envelopeId = needText(raw, "envelope_id", 200);
      // One row per envelope: the id is deterministic, `envelope:<envelope_id>` (contract E5).
      checkEventId(common.eventId === `envelope:${envelopeId}`);
      return {
        envelopeId,
        linkType: optText(raw, "link_type", 40),
        linkId: optText(raw, "link_id", 200),
        linkSource: optText(raw, "link_source", 80),
        label: needText(raw, "label"),
        goalKind: optText(raw, "goal_kind", 80),
        balance: needDecimal(raw, "balance"),
        targetAmount: optDecimal(raw, "target_amount"),
        targetDate: optIsoDate(raw, "target_date"),
        currency: needCurrency(raw, "currency"),
        status: optText(raw, "status", 40),
        asOf: optTimestamp(raw, "as_of"),
        deepLink: optHttpUrl(raw, "deep_link"),
      };
    }),
  toRow: (e, userId) => ({
    userId,
    eventId: e.eventId,
    isActive: e.isActive,
    occurredAt: e.occurredAt,
    envelopeId: e.envelopeId,
    linkType: e.linkType,
    linkId: e.linkId,
    linkSource: e.linkSource,
    label: e.label,
    goalKind: e.goalKind,
    balance: e.balance,
    targetAmount: e.targetAmount,
    targetDate: e.targetDate,
    currency: e.currency,
    status: e.status,
    asOf: e.asOf,
    deepLink: e.deepLink,
  }),
};

// ---------------------------------------------------------------------------------------------
// E6 calendar.activity → calendar_activities
// ---------------------------------------------------------------------------------------------

export type CalendarRow = typeof calendarActivities.$inferInsert;

export interface TripToken {
  distance_miles: number | null;
  mode: string | null;
  duration_min: number | null;
}

function optTripToken(raw: Record<string, unknown>): TripToken | null {
  const v = raw.trip_token;
  if (v === undefined || v === null) return null;
  if (typeof v !== "object" || Array.isArray(v)) failField("trip_token");
  const t = v as Record<string, unknown>;
  const num = (x: unknown, name: string): number | null => {
    if (x === undefined || x === null) return null;
    if (typeof x !== "number" || !Number.isFinite(x) || x < 0) failField(name);
    return x;
  };
  const mode = t.mode === undefined || t.mode === null ? null : t.mode;
  if (mode !== null && (typeof mode !== "string" || mode.length > 40)) failField("trip_token.mode");
  // Only the three known keys are kept; anything else in the token is dropped.
  return {
    distance_miles: num(t.distance_miles, "trip_token.distance_miles"),
    mode: mode as string | null,
    duration_min: num(t.duration_min, "trip_token.duration_min"),
  };
}

export const calendarActivitySpec: EventTypeSpec<
  Omit<CalendarRow, "userId" | "eventId" | "isActive" | "occurredAt" | "id" | "receivedAt">,
  CalendarRow
> = {
  receiver: "calendarActivity",
  eventType: "calendar.activity",
  parse: (raw, common) =>
    fields(() => {
      checkEventId(common.eventId.startsWith("cal:") && common.eventId.length > 4);
      const status = optText(raw, "status", 20);
      if (status !== null && status !== "confirmed" && status !== "cancelled") failField("status");
      return {
        startsAt: optTimestamp(raw, "starts_at"),
        endsAt: optTimestamp(raw, "ends_at"),
        allDay: optBoolean(raw, "all_day"),
        timeZone: optText(raw, "time_zone", 64),
        title: optText(raw, "title"),
        location: optText(raw, "location"),
        calendarLabel: optText(raw, "calendar_label", 200),
        status,
        tripToken: optTripToken(raw),
      };
    }),
  toRow: (e, userId) => ({
    userId,
    eventId: e.eventId,
    isActive: e.isActive,
    occurredAt: e.occurredAt,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    allDay: e.allDay,
    timeZone: e.timeZone,
    title: e.title,
    location: e.location,
    calendarLabel: e.calendarLabel,
    status: e.status,
    tripToken: e.tripToken,
  }),
};

// ---------------------------------------------------------------------------------------------
// E7 cost.matched → finance_matches
// ---------------------------------------------------------------------------------------------

export type FinanceMatchRow = typeof financeMatches.$inferInsert;

const SOURCE_TYPE = /^[a-z][a-z_]{0,39}$/;

export const financeMatchSpec: EventTypeSpec<
  Omit<FinanceMatchRow, "userId" | "eventId" | "isActive" | "occurredAt" | "id" | "receivedAt">,
  FinanceMatchRow
> = {
  receiver: "financeMatch",
  eventType: "cost.matched",
  parse: (raw, common) =>
    fields(() => {
      const sourceType = needText(raw, "source_type", 40);
      if (!SOURCE_TYPE.test(sourceType)) failField("source_type");
      const sourceId = needText(raw, "source_id", 200);
      // One row per cost item: `match:<source_type>:<source_id>` (contract E7).
      checkEventId(common.eventId === `match:${sourceType}:${sourceId}`);
      return {
        sourceType,
        sourceId,
        matched: needBoolean(raw, "matched"),
        transactionAmount: optDecimal(raw, "transaction_amount"),
        transactionCurrency: optCurrency(raw, "transaction_currency"),
        transactionDate: optIsoDate(raw, "transaction_date"),
        deepLink: optHttpUrl(raw, "deep_link"),
      };
    }),
  toRow: (e, userId) => ({
    userId,
    eventId: e.eventId,
    isActive: e.isActive,
    occurredAt: e.occurredAt,
    sourceType: e.sourceType,
    sourceId: e.sourceId,
    matched: e.matched,
    transactionAmount: e.transactionAmount,
    transactionCurrency: e.transactionCurrency,
    transactionDate: e.transactionDate,
    deepLink: e.deepLink,
  }),
};

// ---------------------------------------------------------------------------------------------
// The Drizzle writer
// ---------------------------------------------------------------------------------------------

type ProjectionTable = typeof envelopeBalances | typeof calendarActivities | typeof financeMatches;

/** Columns the upsert never overwrites: the row's identity and its first-insert id. */
const KEPT_COLUMNS = new Set(["id", "user_id", "event_id"]);

/** `SET <column> = excluded.<column>` for every column but the identity; `received_at` = now(). */
export function upsertSet(table: PgTable): Record<string, SQL> {
  const set: Record<string, SQL> = {};
  for (const column of getTableConfig(table).columns) {
    if (KEPT_COLUMNS.has(column.name)) continue;
    const key = Object.entries(table).find(([, c]) => c === column)?.[0];
    if (!key) continue;
    set[key] = column.name === "received_at" ? sql`now()` : sql.raw(`excluded."${column.name}"`);
  }
  return set;
}

/**
 * The upsert statement (built, not run), so tests can read its SQL. The three tables share every
 * column this touches by name (user_id, event_id, occurred_at), so one builder serves all three;
 * the cast only quiets Drizzle's per-table insert types, which a union of tables cannot satisfy.
 */
export function upsertLatest(db: Db, table: ProjectionTable, rows: ProjectionTable["$inferInsert"][]) {
  const t = table as typeof envelopeBalances;
  return db
    .insert(t)
    .values(rows as EnvelopeRow[])
    .onConflictDoUpdate({
      target: [t.userId, t.eventId],
      set: upsertSet(t),
      // Older facts change nothing; equal ones replace (last write wins).
      setWhere: sql`${t.occurredAt} <= excluded.occurred_at`,
    });
}

/** A ProjectionWriter over one table. */
export function drizzleWriter<T extends ProjectionTable>(db: Db, table: T): ProjectionWriter<T["$inferInsert"]> {
  return {
    async userIdsForSubs(subs) {
      const found = await db.select({ id: users.id, sub: users.witusSub }).from(users).where(inArray(users.witusSub, subs));
      return new Map(found.map((u) => [u.sub, u.id]));
    },
    async upsert(rows) {
      await upsertLatest(db, table, rows);
    },
  };
}
