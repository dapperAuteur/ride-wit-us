"use client";

import { otherSystem } from "@/lib/units/convert";
import { useUnits } from "./units-provider";

const LABEL = { metric: "metric", imperial: "imperial" } as const;

/**
 * "Show metric" / "Show imperial (your default)". A toggle button (aria-pressed) rather than a
 * radio pair: there are exactly two states and the pressed state means "showing the other system".
 * The polite status line tells screen-reader users what changed, since every number on the page
 * just re-rendered.
 */
export function UnitsToggle() {
  const { system, defaultSystem, isShowingOther, toggle } = useUnits();
  const next = otherSystem(system);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={isShowingOther}
        className="inline-flex items-center justify-center min-h-11 px-4 border-2 border-[#221E1B] bg-[#fff8e8] text-[#221E1B] font-semibold rounded-lg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]"
      >
        Show {LABEL[next]}
        {next === defaultSystem ? " (your default)" : ""}
      </button>
      <p role="status" aria-live="polite" className="text-sm text-[#221E1B]/80">
        {isShowingOther
          ? `Showing ${LABEL[system]} on this page. Your default stays ${LABEL[defaultSystem]}.`
          : `Showing ${LABEL[system]}, your default.`}
      </p>
    </div>
  );
}
