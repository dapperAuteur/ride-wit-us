import { describe, expect, it } from "vitest";
import { canUseMobility, resolveAccess } from "./access";
import { monthBounds } from "./dates";
import { parseSettings } from "./settings-schema";

describe("monthBounds", () => {
  it("cuts the month on the user's calendar", () => {
    // 2026-11-01 03:00 UTC is still October 31 in Chicago.
    const now = new Date("2026-11-01T03:00:00Z");
    expect(monthBounds(now, "America/Chicago")).toEqual({ start: "2026-10-01", nextStart: "2026-11-01" });
    expect(monthBounds(now, null)).toEqual({ start: "2026-11-01", nextStart: "2026-12-01" });
  });

  it("rolls December into the next year", () => {
    expect(monthBounds(new Date("2026-12-15T12:00:00Z"), "UTC")).toEqual({ start: "2026-12-01", nextStart: "2027-01-01" });
  });
});

describe("resolveAccess", () => {
  it("makes the admin the owner regardless of what is stored", () => {
    expect(resolveAccess(null, true)).toBe("owner");
    expect(resolveAccess("waitlisted", true)).toBe("owner");
  });

  it("keeps a granted member", () => {
    expect(resolveAccess("member", false)).toBe("member");
  });

  it("waitlists everyone else, including a former owner", () => {
    expect(resolveAccess(null, false)).toBe("waitlisted");
    expect(resolveAccess("owner", false)).toBe("waitlisted");
  });

  it("lets owners and members in, nobody else", () => {
    expect(canUseMobility("owner")).toBe(true);
    expect(canUseMobility("member")).toBe(true);
    expect(canUseMobility("waitlisted")).toBe(false);
  });
});

describe("parseSettings", () => {
  it("accepts a full valid form and normalizes the currency", () => {
    expect(parseSettings({ unitSystem: "metric", homeCurrency: " mxn ", timeZone: "America/Chicago" })).toEqual({
      ok: true,
      data: { unitSystem: "metric", homeCurrency: "MXN", timeZone: "America/Chicago" },
    });
  });

  it("treats blank optional fields as not set", () => {
    expect(parseSettings({ unitSystem: "imperial", homeCurrency: "", timeZone: "  " })).toEqual({
      ok: true,
      data: { unitSystem: "imperial", homeCurrency: null, timeZone: null },
    });
  });

  it("rejects an unknown unit system", () => {
    const r = parseSettings({ unitSystem: "nautical", homeCurrency: "", timeZone: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.unitSystem).toMatch(/metric or imperial/);
  });

  it("rejects a malformed currency and an unknown time zone", () => {
    const r = parseSettings({ unitSystem: "metric", homeCurrency: "US$", timeZone: "Mars/Olympus" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.homeCurrency).toMatch(/three-letter/);
      expect(r.fieldErrors.timeZone).toMatch(/time zone/);
    }
  });
});
