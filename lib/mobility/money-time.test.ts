import { describe, expect, it } from "vitest";
import { estimateCo2Kg } from "./co2";
import { formatAmount, subtotalsByCurrency, subtotalsText, toCents } from "./money";
import { formatDate, formatZoned, utcToZonedLocal, zonedLocalToUtc } from "./zoned-time";

describe("money", () => {
  it("parses numeric strings to integer cents", () => {
    expect(toCents("12.5")).toBe(1250);
    expect(toCents("0.10")).toBe(10);
    expect(toCents(null)).toBeNull();
    expect(toCents("abc")).toBeNull();
  });

  it("subtotals per currency and never converts", () => {
    const subs = subtotalsByCurrency([
      { costAmount: "0.10", costCurrency: "USD" },
      { costAmount: "0.20", costCurrency: "USD" },
      { costAmount: "1850.00", costCurrency: "MXN" },
      { costAmount: null, costCurrency: null },
      { costAmount: "5", costCurrency: "usd" },
    ]);
    expect(subs.map((s) => [s.currency, s.cents, s.count])).toEqual([
      ["USD", 530, 3],
      ["MXN", 185000, 1],
    ]);
    expect(subtotalsText(subs)).toBe("$5.30 + MX$1,850.00");
  });

  it("has no total for nothing", () => {
    expect(subtotalsText(subtotalsByCurrency([]))).toBeNull();
  });

  it("formats a single amount", () => {
    expect(formatAmount("412.1", "USD")).toBe("$412.10");
    expect(formatAmount("412.1", null)).toBeNull();
  });
});

describe("zoned time", () => {
  it("turns local wall-clock time in a zone into the instant", () => {
    // October: Chicago is UTC-5 (CDT), New York UTC-4 (EDT).
    expect(zonedLocalToUtc("2026-10-05T08:10", "America/Chicago")?.toISOString()).toBe("2026-10-05T13:10:00.000Z");
    expect(zonedLocalToUtc("2026-10-05T11:45", "America/New_York")?.toISOString()).toBe("2026-10-05T15:45:00.000Z");
    expect(zonedLocalToUtc("2026-01-05T08:10", "America/Chicago")?.toISOString()).toBe("2026-01-05T14:10:00.000Z");
  });

  it("rejects malformed times, impossible dates, and unknown zones", () => {
    expect(zonedLocalToUtc("2026-10-05 08:10", "UTC")).toBeNull();
    expect(zonedLocalToUtc("2026-02-30T08:10", "UTC")).toBeNull();
    expect(zonedLocalToUtc("2026-10-05T08:10", "Mars/Olympus")).toBeNull();
  });

  it("round-trips through the form value", () => {
    const at = zonedLocalToUtc("2026-03-08T01:30", "America/Chicago")!;
    expect(utcToZonedLocal(at, "America/Chicago")).toBe("2026-03-08T01:30");
    const tokyo = zonedLocalToUtc("2026-10-06T07:05", "Asia/Tokyo")!;
    expect(utcToZonedLocal(tokyo, "Asia/Tokyo")).toBe("2026-10-06T07:05");
  });

  it("shows each end in its own zone", () => {
    const at = new Date("2026-10-05T13:10:00Z");
    expect(formatZoned(at, "America/Chicago")).toMatch(/8:10\s?AM CDT/);
    expect(formatZoned(at, null)).toMatch(/1:10\s?PM UTC/);
  });

  it("formats a stored date without shifting it", () => {
    expect(formatDate("2026-10-05")).toBe("Mon, Oct 5, 2026");
  });
});

describe("co2", () => {
  it("ports CentenarianOS's per-mile factors onto meters", () => {
    expect(estimateCo2Kg("car", 1609.344 * 10, false)).toBeCloseTo(1.7, 6);
    expect(estimateCo2Kg("car", 1609.344 * 10, true)).toBeCloseTo(3.4, 6);
    expect(estimateCo2Kg("bike", 5000, false)).toBe(0);
  });

  it("gives no estimate without a factor or a distance", () => {
    expect(estimateCo2Kg("scooter", 5000, false)).toBeNull();
    expect(estimateCo2Kg("car", null, false)).toBeNull();
  });
});
