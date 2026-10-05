/**
 * Formatting canonical measurements for display. Pure, so server and client render the same text.
 */
import {
  DISPLAY_UNITS,
  EFFICIENCY_SPOKEN,
  EFFICIENCY_UNITS,
  SPOKEN_UNITS,
  efficiency,
  fromCanonical,
  type Dimension,
  type UnitSystem,
} from "./convert";

export interface FormattedMeasurement {
  /** Number only, localized, for example "1,204.5". */
  value: string;
  /** Short unit, for example "mi". */
  unit: string;
  /** "1,204.5 mi" */
  text: string;
  /** "1,204.5 miles", for screen readers. */
  spoken: string;
}

export interface FormatOptions {
  /** Defaults per dimension: see DEFAULT_DIGITS. */
  maximumFractionDigits?: number;
  /** BCP 47 locale. Defaults to en-US so server and client output match. */
  locale?: string;
}

/** Sensible precision per dimension. Distance and volume to a tenth; pressure to a whole number. */
const DEFAULT_DIGITS: Record<Dimension | "efficiency", number> = {
  distance: 1,
  volume: 2,
  speed: 1,
  weight: 1,
  pressure: 0,
  efficiency: 1,
};

/** Placeholder for a missing value. An em dash would read as "em dash" to a screen reader. */
export const MISSING: FormattedMeasurement = {
  value: "",
  unit: "",
  text: "Not recorded",
  spoken: "Not recorded",
};

function formatNumber(n: number, digits: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(n);
}

/** Format a canonical stored value in `system`'s display unit. Null or non-finite → MISSING. */
export function formatMeasurement(
  canonical: number | null | undefined,
  dimension: Dimension,
  system: UnitSystem,
  options: FormatOptions = {}
): FormattedMeasurement {
  if (canonical == null || !Number.isFinite(canonical)) return MISSING;
  const digits = options.maximumFractionDigits ?? DEFAULT_DIGITS[dimension];
  const value = formatNumber(fromCanonical(canonical, dimension, system), digits, options.locale ?? "en-US");
  const unit = DISPLAY_UNITS[dimension][system];
  return { value, unit, text: `${value} ${unit}`, spoken: `${value} ${SPOKEN_UNITS[dimension][system]}` };
}

/** Format fuel efficiency from canonical distance (m) and volume (L). */
export function formatEfficiency(
  distanceMeters: number | null | undefined,
  liters: number | null | undefined,
  system: UnitSystem,
  options: FormatOptions = {}
): FormattedMeasurement {
  const e = efficiency(distanceMeters, liters, system);
  if (e == null) return MISSING;
  const value = formatNumber(e, options.maximumFractionDigits ?? DEFAULT_DIGITS.efficiency, options.locale ?? "en-US");
  const unit = EFFICIENCY_UNITS[system];
  return { value, unit, text: `${value} ${unit}`, spoken: `${value} ${EFFICIENCY_SPOKEN[system]}` };
}
