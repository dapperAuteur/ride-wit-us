import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { UNIT_SYSTEMS } from "@/lib/units/convert";
import { databaseConfigured, databaseUrl } from "@/lib/db/config";
import { trips, unitSystem, users, vendorRefs } from "./index";

describe("schema", () => {
  it("unit_system enum matches the units library", () => {
    expect([...unitSystem.enumValues].sort()).toEqual([...UNIT_SYSTEMS].sort());
  });

  it("keys users by the WitUS subject", () => {
    const cfg = getTableConfig(users);
    const sub = cfg.columns.find((c) => c.name === "witus_sub");
    expect(sub?.notNull).toBe(true);
    expect(sub?.isUnique).toBe(true);
  });

  it("stores vendor references only, no vendor details", () => {
    const names = getTableConfig(vendorRefs).columns.map((c) => c.name).sort();
    expect(names).toEqual(["centos_contact_id", "centos_location_id", "created_at", "id", "user_id"]);
  });

  it("stores trip money with its currency and distance in meters", () => {
    const names = getTableConfig(trips).columns.map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(["cost_amount", "cost_currency", "distance_m", "flight_number"]));
    expect(names.some((n) => n.includes("miles"))).toBe(false);
  });
});

describe("database config", () => {
  it("is unconfigured without DATABASE_URL", () => {
    expect(databaseConfigured({})).toBe(false);
    expect(databaseConfigured({ DATABASE_URL: "  " })).toBe(false);
  });

  it("rejects a value that is not a Postgres URL", () => {
    expect(databaseUrl({ DATABASE_URL: "https://example.com" })).toBeNull();
  });

  it("accepts postgres and postgresql URLs", () => {
    const url = "postgresql://u:p@host.example/db?sslmode=require";
    expect(databaseUrl({ DATABASE_URL: url })).toBe(url);
    expect(databaseConfigured({ DATABASE_URL: "postgres://u:p@h/db" })).toBe(true);
  });
});
