import { describe, expect, it } from "vitest";
import {
  MPG_L100KM_CONSTANT,
  efficiency,
  efficiencyHigherIsBetter,
  fromCanonical,
  gallonsToLiters,
  isUnitSystem,
  kgToPounds,
  kmToMiles,
  kmhToMph,
  kpaToPsi,
  lPer100KmToMpg,
  litersToGallons,
  milesToKm,
  mpgToLPer100Km,
  mphToKmh,
  otherSystem,
  poundsToKg,
  psiToKpa,
  toCanonical,
  type Dimension,
} from "./convert";
import { MISSING, formatEfficiency, formatMeasurement } from "./format";

describe("named conversions", () => {
  it("distance: 1 mile is exactly 1.609344 km", () => {
    expect(milesToKm(1)).toBeCloseTo(1.609344, 12);
    expect(kmToMiles(1.609344)).toBeCloseTo(1, 12);
    expect(kmToMiles(100)).toBeCloseTo(62.137119, 6);
  });

  it("fuel volume: 1 U.S. gallon is exactly 3.785411784 L", () => {
    expect(gallonsToLiters(1)).toBeCloseTo(3.785411784, 12);
    expect(litersToGallons(37.85411784)).toBeCloseTo(10, 12);
  });

  it("speed: 60 mph is about 96.56 km/h", () => {
    expect(mphToKmh(60)).toBeCloseTo(96.56064, 5);
    expect(kmhToMph(100)).toBeCloseTo(62.137119, 6);
  });

  it("weight: 1 lb is exactly 0.45359237 kg", () => {
    expect(poundsToKg(1)).toBeCloseTo(0.45359237, 12);
    expect(kgToPounds(100)).toBeCloseTo(220.462262, 6);
  });

  it("tire pressure: 32 psi is about 220.6 kPa", () => {
    expect(psiToKpa(32)).toBeCloseTo(220.632, 3);
    expect(kpaToPsi(psiToKpa(35))).toBeCloseTo(35, 12);
  });
});

describe("efficiency mpg ↔ L/100 km", () => {
  it("uses the reciprocal constant ≈ 235.2146", () => {
    expect(MPG_L100KM_CONSTANT).toBeCloseTo(235.214583, 6);
  });

  it("30 mpg is about 7.84 L/100 km and back", () => {
    const l100 = mpgToLPer100Km(30);
    expect(l100).toBeCloseTo(7.8405, 4);
    expect(lPer100KmToMpg(l100 as number)).toBeCloseTo(30, 10);
  });

  it("returns null for zero, negative, or non-finite input instead of Infinity", () => {
    expect(mpgToLPer100Km(0)).toBeNull();
    expect(mpgToLPer100Km(-5)).toBeNull();
    expect(lPer100KmToMpg(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("derives efficiency from stored meters and liters in either system", () => {
    // 300 miles on 10 gallons = 30 mpg.
    const meters = 300 * 1609.344;
    const liters = 10 * 3.785411784;
    expect(efficiency(meters, liters, "imperial")).toBeCloseTo(30, 10);
    expect(efficiency(meters, liters, "metric")).toBeCloseTo(7.8405, 4);
  });

  it("has no efficiency without both quantities", () => {
    expect(efficiency(null, 10, "imperial")).toBeNull();
    expect(efficiency(1000, 0, "metric")).toBeNull();
    expect(efficiency(0, 10, "metric")).toBeNull();
  });

  it("knows which direction is better", () => {
    expect(efficiencyHigherIsBetter("imperial")).toBe(true);
    expect(efficiencyHigherIsBetter("metric")).toBe(false);
  });
});

describe("canonical round trips", () => {
  const dims: Dimension[] = ["distance", "volume", "speed", "weight", "pressure"];
  for (const d of dims) {
    for (const system of ["metric", "imperial"] as const) {
      it(`${d} typed in ${system} survives storage`, () => {
        const typed = 123.456;
        expect(fromCanonical(toCanonical(typed, d, system), d, system)).toBeCloseTo(typed, 9);
      });
    }
  }

  it("stores distance in meters", () => {
    expect(toCanonical(1, "distance", "imperial")).toBeCloseTo(1609.344, 9);
    expect(toCanonical(1, "distance", "metric")).toBe(1000);
  });

  it("stores speed in meters per second", () => {
    expect(toCanonical(36, "speed", "metric")).toBeCloseTo(10, 12);
  });
});

describe("system helpers", () => {
  it("flips the system", () => {
    expect(otherSystem("metric")).toBe("imperial");
    expect(otherSystem("imperial")).toBe("metric");
  });

  it("narrows unknown input", () => {
    expect(isUnitSystem("metric")).toBe(true);
    expect(isUnitSystem("Metric")).toBe(false);
    expect(isUnitSystem(undefined)).toBe(false);
  });
});

describe("formatting", () => {
  it("formats distance with the unit and a spoken form", () => {
    const f = formatMeasurement(16093.44, "distance", "imperial");
    expect(f).toEqual({ value: "10", unit: "mi", text: "10 mi", spoken: "10 miles" });
    expect(formatMeasurement(16093.44, "distance", "metric").text).toBe("16.1 km");
  });

  it("groups thousands and respects fraction digits", () => {
    expect(formatMeasurement(1_234_567, "distance", "metric").text).toBe("1,234.6 km");
    expect(formatMeasurement(1000, "distance", "metric", { maximumFractionDigits: 3 }).text).toBe("1 km");
  });

  it("formats volume, weight and pressure", () => {
    expect(formatMeasurement(37.85411784, "volume", "imperial").text).toBe("10 gal");
    expect(formatMeasurement(80, "weight", "imperial").text).toBe("176.4 lb");
    expect(formatMeasurement(220.632, "pressure", "imperial").text).toBe("32 psi");
    expect(formatMeasurement(220.632, "pressure", "metric").text).toBe("221 kPa");
  });

  it("says 'Not recorded' for a missing value rather than showing zero", () => {
    expect(formatMeasurement(null, "distance", "metric")).toEqual(MISSING);
    expect(formatMeasurement(Number.NaN, "volume", "imperial")).toEqual(MISSING);
  });

  it("formats efficiency in each system", () => {
    const meters = 300 * 1609.344;
    const liters = 10 * 3.785411784;
    expect(formatEfficiency(meters, liters, "imperial").text).toBe("30 mpg");
    expect(formatEfficiency(meters, liters, "metric").text).toBe("7.8 L/100 km");
    expect(formatEfficiency(meters, 0, "metric")).toEqual(MISSING);
  });
});
