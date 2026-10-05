"use client";

import type { Dimension } from "@/lib/units/convert";
import { formatEfficiency, formatMeasurement } from "@/lib/units/format";
import { useUnits } from "./units-provider";

/**
 * A canonical stored value shown in the page's current unit system. Visible text is the short
 * form ("12.4 mi"); screen readers get the spoken form ("12.4 miles"), because "mi" read letter by
 * letter means nothing.
 */
export function Measurement({
  value,
  dimension,
  digits,
}: {
  value: number | null | undefined;
  dimension: Dimension;
  digits?: number;
}) {
  const { system } = useUnits();
  const f = formatMeasurement(value, dimension, system, { maximumFractionDigits: digits });
  return (
    <>
      <span aria-hidden="true">{f.text}</span>
      <span className="sr-only">{f.spoken}</span>
    </>
  );
}

/** Fuel efficiency from stored meters and liters, in mpg or L/100 km. */
export function Efficiency({ meters, liters }: { meters: number | null | undefined; liters: number | null | undefined }) {
  const { system } = useUnits();
  const f = formatEfficiency(meters, liters, system);
  return (
    <>
      <span aria-hidden="true">{f.text}</span>
      <span className="sr-only">{f.spoken}</span>
    </>
  );
}
