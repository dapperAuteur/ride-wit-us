/**
 * Journey (multi-leg trip) and lodging-stay form validation. Pure.
 */
import { z } from "zod";
import {
  collectErrors,
  optAmount,
  optCurrency,
  optDate,
  optText,
  optUuid,
  reqDate,
  reqEnum,
  reqText,
  type Parsed,
} from "./form-kit";
import { TRIP_STATUSES, type TripStatus } from "./options";

export interface JourneyInput {
  name: string;
  status: TripStatus;
  startDate: string;
  endDate: string | null;
  packingNotes: string | null;
  notes: string | null;
}

const journeySchema = z
  .object({
    name: reqText(120, "Name the trip, for example \"Chicago, October\"."),
    status: reqEnum(TRIP_STATUSES, "Choose planned, in progress, done, or cancelled."),
    startDate: reqDate("Add the first day of the trip."),
    endDate: optDate(),
    packingNotes: optText(4000),
    notes: optText(4000),
  })
  .superRefine((v, ctx) => {
    if (v.endDate && v.endDate < v.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "The last day is before the first day." });
    }
  });

export function parseJourneyForm(input: Record<string, unknown>): Parsed<JourneyInput> {
  const r = journeySchema.safeParse(input);
  return r.success ? { ok: true, data: r.data } : { ok: false, fieldErrors: collectErrors(r.error) };
}

export interface StayInput {
  name: string;
  placeId: string | null;
  address: string | null;
  checkInDate: string;
  checkOutDate: string;
  confirmationNumber: string | null;
  roomType: string | null;
  costAmount: string | null;
  costCurrency: string | null;
  notes: string | null;
}

const staySchema = z
  .object({
    name: reqText(120, "Name the place you're staying."),
    placeId: optUuid("That choice isn't available. Pick again from the list."),
    address: optText(240),
    checkInDate: reqDate("Add the check-in date."),
    checkOutDate: reqDate("Add the check-out date."),
    confirmationNumber: optText(40),
    roomType: optText(80),
    costAmount: optAmount(),
    costCurrency: optCurrency(),
    notes: optText(2000),
  })
  .superRefine((v, ctx) => {
    if (v.checkOutDate < v.checkInDate) {
      ctx.addIssue({ code: "custom", path: ["checkOutDate"], message: "Check-out is before check-in." });
    }
    if (v.costAmount && !v.costCurrency) {
      ctx.addIssue({ code: "custom", path: ["costCurrency"], message: "Add the currency you paid in." });
    }
  });

export function parseStayForm(input: Record<string, unknown>): Parsed<StayInput> {
  const r = staySchema.safeParse(input);
  if (!r.success) return { ok: false, fieldErrors: collectErrors(r.error) };
  return { ok: true, data: { ...r.data, costCurrency: r.data.costAmount ? r.data.costCurrency : null } };
}

/** Nights between two YYYY-MM-DD dates. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = Date.parse(`${checkIn}T00:00:00Z`);
  const b = Date.parse(`${checkOut}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, Math.round((b - a) / 86_400_000)) : 0;
}
