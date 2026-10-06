/**
 * Vehicle form validation. Distances arrive in the units the form was showing (`inputUnits`) and
 * leave as meters; money leaves as amount + currency, never converted. Pure.
 */
import { z } from "zod";
import { UNIT_SYSTEMS, toCanonical, type UnitSystem } from "@/lib/units/convert";
import {
  checkbox,
  collectErrors,
  optAmount,
  optCurrency,
  optDate,
  optEnum,
  optInt,
  optNumber,
  optText,
  reqEnum,
  reqText,
  type Parsed,
} from "./form-kit";
import {
  TRIP_MODES,
  VEHICLE_ENERGY,
  VEHICLE_KINDS,
  VEHICLE_OWNERSHIP,
  type TripMode,
  type VehicleEnergy,
  type VehicleKind,
  type VehicleOwnership,
} from "./options";

export interface VehicleInput {
  kind: VehicleKind;
  nickname: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  ownership: VehicleOwnership;
  energy: VehicleEnergy | null;
  defaultTripMode: TripMode | null;
  odometerOffsetM: number | null;
  purchasePrice: string | null;
  purchaseCurrency: string | null;
  purchaseDate: string | null;
  expectedLifeYears: number | null;
  expectedLifeM: number | null;
  salvageValue: string | null;
  isActive: boolean;
}

const schema = z
  .object({
    inputUnits: z.enum(UNIT_SYSTEMS as [UnitSystem, ...UnitSystem[]], { error: "Reload the page and try again." }),
    kind: reqEnum(VEHICLE_KINDS, "Choose what kind of vehicle this is."),
    nickname: reqText(80, "Give it a name, for example \"Blue Brompton\"."),
    make: optText(80),
    model: optText(80),
    year: optInt(1885, 2100, "Use a year between 1885 and 2100."),
    color: optText(40),
    ownership: reqEnum(VEHICLE_OWNERSHIP, "Choose owned, rented, borrowed, or shared."),
    energy: optEnum(VEHICLE_ENERGY, "Choose a fuel or power source from the list."),
    defaultTripMode: optEnum(TRIP_MODES, "Choose a trip mode from the list."),
    odometer: optNumber(0, 10_000_000, "Use a distance of zero or more."),
    purchasePrice: optAmount(),
    purchaseCurrency: optCurrency(),
    purchaseDate: optDate(),
    expectedLifeYears: optNumber(0, 200, "Use a number of years from 0 to 200."),
    expectedLife: optNumber(0, 10_000_000, "Use a distance of zero or more."),
    salvageValue: optAmount(),
    isActive: checkbox(),
  })
  .superRefine((v, ctx) => {
    if ((v.purchasePrice || v.salvageValue) && !v.purchaseCurrency) {
      ctx.addIssue({ code: "custom", path: ["purchaseCurrency"], message: "Add the currency the price is in." });
    }
  });

export function parseVehicleForm(input: Record<string, unknown>): Parsed<VehicleInput> {
  const r = schema.safeParse(input);
  if (!r.success) return { ok: false, fieldErrors: collectErrors(r.error) };
  const v = r.data;
  const toM = (n: number | null) => (n == null ? null : toCanonical(n, "distance", v.inputUnits));
  const hasMoney = !!(v.purchasePrice || v.salvageValue);
  return {
    ok: true,
    data: {
      kind: v.kind,
      nickname: v.nickname,
      make: v.make,
      model: v.model,
      year: v.year,
      color: v.color,
      ownership: v.ownership,
      energy: v.energy,
      defaultTripMode: v.defaultTripMode,
      odometerOffsetM: toM(v.odometer),
      purchasePrice: v.purchasePrice,
      // A currency with no price or salvage value is just the pre-filled home currency: drop it.
      purchaseCurrency: hasMoney ? v.purchaseCurrency : null,
      purchaseDate: v.purchaseDate,
      expectedLifeYears: v.expectedLifeYears,
      expectedLifeM: toM(v.expectedLife),
      salvageValue: v.salvageValue,
      isActive: v.isActive,
    },
  };
}
