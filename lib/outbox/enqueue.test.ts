import { drizzle } from "drizzle-orm/neon-http";
import { describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import type { Db } from "@/db";
import { cronAuthorized } from "./cron-auth";
import { enqueueStatement } from "./enqueue";

const db = drizzle.mock({ schema }) as unknown as Db;
const EVENT = {
  receiver: "centos.mobility_activity" as const,
  eventId: "trip:T1",
  eventType: "trip.summary",
  occurredAt: new Date("2026-10-31T13:00:00Z"),
  payload: { event_id: "trip:T1" },
};

describe("enqueueStatement", () => {
  it("returns nothing to run for no events", () => {
    expect(enqueueStatement(db, "u", [])).toBeNull();
  });

  it("keeps one row per (receiver, event_id), re-queued as due now unless the stored one is newer", () => {
    const { sql } = enqueueStatement(db, "u", [EVENT])!.toSQL();
    expect(sql).toMatch(/on conflict \("receiver","event_id"\) do update set/i);
    expect(sql).toContain('"payload" = excluded.payload');
    expect(sql).toContain('"status" = $');
    expect(sql).toContain('"attempts" = $');
    expect(sql).toContain('"next_attempt_at" = now()');
    expect(sql).toContain('where "outbound_events"."occurred_at" <= excluded.occurred_at');
  });
});

describe("cronAuthorized", () => {
  it("needs the exact Bearer secret, and a secret at all", () => {
    expect(cronAuthorized("Bearer s3cret-value", "s3cret-value")).toBe("ok");
    expect(cronAuthorized("Bearer wrong", "s3cret-value")).toBe("unauthorized");
    expect(cronAuthorized(null, "s3cret-value")).toBe("unauthorized");
    expect(cronAuthorized("s3cret-value", "s3cret-value")).toBe("unauthorized");
    expect(cronAuthorized("Bearer ", undefined)).toBe("not_configured");
  });
});
