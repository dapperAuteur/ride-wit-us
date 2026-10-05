/**
 * Unit conversion for the mobility module. Pure: no React, no env, no I/O.
 *
 * STORAGE IS METRIC. The database holds canonical SI-ish values (meters, liters, kilograms,
 * kilopascals, meters per second). Imperial exists only at display and input, so a user who flips
 * their default never rewrites a row, and a value typed in either system round-trips.
 *
 * FUEL EFFICIENCY IS DERIVED, never stored. It is distance over volume, computed from the two
 * stored quantities. Note the direction flips between systems: higher mpg is better, lower
 * L/100 km is better. Callers that colour "good" and "bad" must ask `efficiencyHigherIsBetter`.
 *
 * Imperial here means U.S. customary: the U.S. gallon (3.785411784 L), not the imperial gallon
 * (4.54609 L). RideWitUS's first user and the CentenarianOS data it migrates are U.S.-based.
 */

export type UnitSystem = "metric" | "imperial";

export const UNIT_SYSTEMS: readonly UnitSystem[] = ["metric", "imperial"] as const;

/** Exact by definition (international mile, 1959). */
export const METERS_PER_MILE = 1609.344;
/** Exact by definition (U.S. liquid gallon = 231 cubic inches). */
export const LITERS_PER_US_GALLON = 3.785411784;
/** Exact by definition (international pound, 1959). */
export const KG_PER_POUND = 0.45359237;
/** Derived from the exact pound-force and inch definitions. */
export const KPA_PER_PSI = 6.894757293168361;

export type Dimension = "distance" | "volume" | "speed" | "weight" | "pressure";

/** The display unit for each dimension in each system. */
export const DISPLAY_UNITS: Record<Dimension, Record<UnitSystem, string>> = {
  distance: { metric: "km", imperial: "mi" },
  volume: { metric: "L", imperial: "gal" },
  speed: { metric: "km/h", imperial: "mph" },
  weight: { metric: "kg", imperial: "lb" },
  pressure: { metric: "kPa", imperial: "psi" },
};

/** Spoken unit names, for `aria-label`s and screen-reader text. Plural form. */
export const SPOKEN_UNITS: Record<Dimension, Record<UnitSystem, string>> = {
  distance: { metric: "kilometers", imperial: "miles" },
  volume: { metric: "liters", imperial: "gallons" },
  speed: { metric: "kilometers per hour", imperial: "miles per hour" },
  weight: { metric: "kilograms", imperial: "pounds" },
  pressure: { metric: "kilopascals", imperial: "pounds per square inch" },
};

export function otherSystem(system: UnitSystem): UnitSystem {
  return system === "metric" ? "imperial" : "metric";
}

export function isUnitSystem(value: unknown): value is UnitSystem {
  return value === "metric" || value === "imperial";
}

// --- Canonical → display ---------------------------------------------------------------------

/**
 * Convert a canonical stored value into the display unit for `system`.
 *
 * Canonical units: distance meters, volume liters, speed meters per second, weight kilograms,
 * pressure kilopascals.
 */
export function fromCanonical(value: number, dimension: Dimension, system: UnitSystem): number {
  switch (dimension) {
    case "distance":
      return system === "metric" ? value / 1000 : value / METERS_PER_MILE;
    case "volume":
      return system === "metric" ? value : value / LITERS_PER_US_GALLON;
    case "speed":
      // m/s → km/h is ×3.6; m/s → mph is ×3600 / meters-per-mile.
      return system === "metric" ? value * 3.6 : (value * 3600) / METERS_PER_MILE;
    case "weight":
      return system === "metric" ? value : value / KG_PER_POUND;
    case "pressure":
      return system === "metric" ? value : value / KPA_PER_PSI;
  }
}

/** Convert a value the user typed in `system`'s display unit into the canonical stored value. */
export function toCanonical(value: number, dimension: Dimension, system: UnitSystem): number {
  switch (dimension) {
    case "distance":
      return system === "metric" ? value * 1000 : value * METERS_PER_MILE;
    case "volume":
      return system === "metric" ? value : value * LITERS_PER_US_GALLON;
    case "speed":
      return system === "metric" ? value / 3.6 : (value * METERS_PER_MILE) / 3600;
    case "weight":
      return system === "metric" ? value : value * KG_PER_POUND;
    case "pressure":
      return system === "metric" ? value : value * KPA_PER_PSI;
  }
}

// --- Direct conversions people ask for by name -----------------------------------------------

export const milesToKm = (mi: number): number => (mi * METERS_PER_MILE) / 1000;
export const kmToMiles = (km: number): number => (km * 1000) / METERS_PER_MILE;
export const gallonsToLiters = (gal: number): number => gal * LITERS_PER_US_GALLON;
export const litersToGallons = (l: number): number => l / LITERS_PER_US_GALLON;
export const mphToKmh = (mph: number): number => (mph * METERS_PER_MILE) / 1000;
export const kmhToMph = (kmh: number): number => (kmh * 1000) / METERS_PER_MILE;
export const poundsToKg = (lb: number): number => lb * KG_PER_POUND;
export const kgToPounds = (kg: number): number => kg / KG_PER_POUND;
export const psiToKpa = (psi: number): number => psi * KPA_PER_PSI;
export const kpaToPsi = (kpa: number): number => kpa / KPA_PER_PSI;

/**
 * mpg (U.S.) ↔ L/100 km. The relation is reciprocal, so it is its own inverse:
 * L/100km = K / mpg and mpg = K / (L/100km), with K = 100 × liters-per-gallon ÷ km-per-mile
 * ≈ 235.2146. Zero or negative input has no meaningful efficiency and returns null.
 */
export const MPG_L100KM_CONSTANT = (100 * LITERS_PER_US_GALLON) / (METERS_PER_MILE / 1000);

export function mpgToLPer100Km(mpg: number): number | null {
  return mpg > 0 && Number.isFinite(mpg) ? MPG_L100KM_CONSTANT / mpg : null;
}

export function lPer100KmToMpg(lPer100Km: number): number | null {
  return lPer100Km > 0 && Number.isFinite(lPer100Km) ? MPG_L100KM_CONSTANT / lPer100Km : null;
}

// --- Fuel efficiency (derived) ---------------------------------------------------------------

export const EFFICIENCY_UNITS: Record<UnitSystem, string> = { metric: "L/100 km", imperial: "mpg" };
export const EFFICIENCY_SPOKEN: Record<UnitSystem, string> = {
  metric: "liters per 100 kilometers",
  imperial: "miles per gallon",
};

/**
 * Fuel efficiency from canonical distance (meters) and volume (liters), in `system`'s unit.
 * Returns null when either quantity is missing, zero, or negative: a fill-up with no distance has
 * no efficiency, and showing 0 or Infinity would be a made-up number.
 */
export function efficiency(
  distanceMeters: number | null | undefined,
  liters: number | null | undefined,
  system: UnitSystem
): number | null {
  if (distanceMeters == null || liters == null) return null;
  if (!(distanceMeters > 0) || !(liters > 0)) return null;
  if (system === "imperial") {
    return distanceMeters / METERS_PER_MILE / (liters / LITERS_PER_US_GALLON);
  }
  return (liters / (distanceMeters / 1000)) * 100;
}

/** True for mpg (more is better), false for L/100 km (less is better). */
export function efficiencyHigherIsBetter(system: UnitSystem): boolean {
  return system === "imperial";
}
