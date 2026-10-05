"use client";

import { useActionState } from "react";
import type { MobilitySettings } from "@/lib/mobility/settings-schema";
import { saveSettings, type SaveSettingsState } from "./actions";

const INPUT =
  "mt-1 block w-full min-h-11 px-3 border-2 border-[#221E1B] bg-white text-[#221E1B] rounded-lg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B] aria-[invalid=true]:border-[#D33E2D]";

const SYSTEMS = [
  { value: "imperial", label: "Imperial", detail: "miles, gallons, mpg, mph, pounds, psi" },
  { value: "metric", label: "Metric", detail: "kilometers, liters, L/100 km, km/h, kilograms, kPa" },
] as const;

export function SettingsForm({ initial }: { initial: MobilitySettings }) {
  const [state, action, pending] = useActionState<SaveSettingsState, FormData>(saveSettings, null);
  const values = state?.ok ? state.data : initial;
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} noValidate className="space-y-8 max-w-xl">
      <fieldset aria-describedby={errors.unitSystem ? "unitSystem-error" : undefined}>
        <legend className="font-display text-2xl text-[#221E1B]">Default units</legend>
        <p className="mt-1 text-sm text-[#221E1B]/80">
          Every page also has a toggle to see the other system without changing this.
        </p>
        <div className="mt-3 space-y-2">
          {SYSTEMS.map((s) => (
            <div key={s.value} className="flex items-start gap-3">
              <input
                id={`unitSystem-${s.value}`}
                type="radio"
                name="unitSystem"
                value={s.value}
                defaultChecked={values.unitSystem === s.value}
                className="mt-1 h-5 w-5 accent-[#221E1B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]"
              />
              <label htmlFor={`unitSystem-${s.value}`} className="text-[#221E1B] min-h-11">
                <span className="font-semibold">{s.label}</span>
                <span className="block text-sm text-[#221E1B]/80">{s.detail}</span>
              </label>
            </div>
          ))}
        </div>
        {errors.unitSystem ? (
          <p id="unitSystem-error" role="alert" className="mt-2 text-sm font-semibold text-[#A3271A]">
            {errors.unitSystem}
          </p>
        ) : null}
      </fieldset>

      <div>
        <label htmlFor="homeCurrency" className="font-semibold text-[#221E1B]">
          Home currency <span className="font-normal text-[#221E1B]/80">(optional)</span>
        </label>
        <p id="homeCurrency-hint" className="text-sm text-[#221E1B]/80">
          Three letters, like USD or MXN. Only pre-fills new costs; every cost keeps the currency you paid in.
        </p>
        <input
          id="homeCurrency"
          name="homeCurrency"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={3}
          defaultValue={values.homeCurrency ?? ""}
          aria-invalid={errors.homeCurrency ? true : undefined}
          aria-describedby={errors.homeCurrency ? "homeCurrency-hint homeCurrency-error" : "homeCurrency-hint"}
          className={`${INPUT} uppercase max-w-[8rem]`}
        />
        {errors.homeCurrency ? (
          <p id="homeCurrency-error" role="alert" className="mt-2 text-sm font-semibold text-[#A3271A]">
            {errors.homeCurrency}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="timeZone" className="font-semibold text-[#221E1B]">
          Time zone <span className="font-normal text-[#221E1B]/80">(optional)</span>
        </label>
        <p id="timeZone-hint" className="text-sm text-[#221E1B]/80">
          A name like America/Chicago. Used to decide which month a trip counts in. Leave blank for UTC.
        </p>
        <input
          id="timeZone"
          name="timeZone"
          type="text"
          autoComplete="off"
          maxLength={64}
          defaultValue={values.timeZone ?? ""}
          aria-invalid={errors.timeZone ? true : undefined}
          aria-describedby={errors.timeZone ? "timeZone-hint timeZone-error" : "timeZone-hint"}
          className={INPUT}
        />
        {errors.timeZone ? (
          <p id="timeZone-error" role="alert" className="mt-2 text-sm font-semibold text-[#A3271A]">
            {errors.timeZone}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center min-h-12 px-6 border-2 border-[#221E1B] bg-[#F4B44A] text-[#221E1B] font-semibold rounded-lg disabled:opacity-60 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        <p role="status" aria-live="polite" className="text-sm text-[#221E1B]">
          {state?.ok ? "Saved." : ""}
        </p>
      </div>
      {state && !state.ok && !state.fieldErrors ? (
        <p role="alert" className="text-sm font-semibold text-[#A3271A]">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
