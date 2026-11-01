/**
 * The ordering rule lives in the upsert's SQL, so this reads the statement Drizzle builds (no
 * database: `drizzle.mock()` builds queries and never connects).
 */
import { drizzle } from "drizzle-orm/neon-http";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { calendarActivities, envelopeBalances, financeMatches } from "@/db/schema";
import type { Db } from "@/db";
import { upsertLatest } from "./projections";

const db = drizzle.mock({ schema }) as unknown as Db;

const row = {
  userId: "11111111-1111-4111-8111-111111111111",
  eventId: "envelope:GOAL_1",
  occurredAt: new Date("2026-10-31T14:00:00Z"),
  envelopeId: "GOAL_1",
  label: "Chicago trip",
  balance: "240.00",
  currency: "USD",
};

describe("upsertLatest", () => {
  for (const table of [envelopeBalances, calendarActivities, financeMatches]) {
    const name = getTableConfig(table).name;

    it(`${name}: conflicts on (user_id, event_id) and only replaces with a newer or equal occurred_at`, () => {
      const { sql } = upsertLatest(db, table, [row as never]).toSQL();
      expect(sql).toMatch(/on conflict \("user_id","event_id"\) do update set/i);
      expect(sql).toContain(`where "${name}"."occurred_at" <= excluded.occurred_at`);
    });

    it(`${name}: replaces every column but the row's identity, and stamps received_at`, () => {
      const { sql } = upsertLatest(db, table, [row as never]).toSQL();
      const set = sql.slice(sql.toLowerCase().indexOf("do update set"));
      for (const column of getTableConfig(table).columns) {
        if (["id", "user_id", "event_id"].includes(column.name)) {
          expect(set, column.name).not.toMatch(new RegExp(`"${column.name}" =`));
        } else if (column.name === "received_at") {
          expect(set).toContain('"received_at" = now()');
        } else {
          expect(set, column.name).toContain(`"${column.name}" = excluded."${column.name}"`);
        }
      }
    });
  }

  it("has a unique (user_id, event_id) key on every projection, matching the conflict target", () => {
    for (const table of [envelopeBalances, calendarActivities, financeMatches]) {
      const cfg = getTableConfig(table);
      const keys = cfg.uniqueConstraints.map((u) => u.columns.map((c) => c.name).join(","));
      expect(keys, cfg.name).toContain("user_id,event_id");
    }
  });
});
