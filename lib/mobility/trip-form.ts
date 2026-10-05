/**
 * Trip (and trip leg) form validation. Distance arrives in the units the form was showing and
 * leaves as meters; times arrive as wall-clock plus an IANA zone and leave as instants plus the
 * zone; money leaves as amount + currency. Pure. Ownership of the referenced vehicle, places and
 * journey is checked separately (./ownership), because it needs the database.
 */
import { z } from "zod";
import { UNIT_SYSTEMS, toCanonical, type UnitSystem } from "@/lib/units/convert";
import {
  blank,
  checkbox,
  collectErrors,
  optAmount,
  optCurrency,
  optDate,
  optEnum,
  optNumber,
  optText,
  optUuid,
  reqEnum,
  type FieldErrors,
  type Parsed,
} from "./form-kit";
import {
  HUMAN_POWERED_MODES,
  TRIP_CATEGORIES,
  TRIP_MODES,
  TRIP_PURPOSES,
  TRIP_STATUSES,
  type TripCategory,
  type TripMode,
  type TripPurpose,
  type TripStatus,
} from "./options";
import { isIanaZone, zonedLocalToUtc } from "./zoned-time";

export interface TripInput {
  mode: TripMode;
  status: TripStatus;
  purpose: TripPurpose | null;
  category: TripCategory;
  vehicleId: string | null;
  journeyId: string | null;
  startDate: string;
  endDate: string | null;
  departedAt: Date | null;
  departTz: string | null;
  arrivedAt: Date | null;
  arriveTz: string | null;
  originPlaceId: string | null;
  originLabel: string | null;
  destinationPlaceId: string | null;
  destinationLabel: string | null;
  isRoundTrip: boolean;
  /** One way. A round trip's total is twice this (see effectiveDistanceM). */
  distanceM: number | null;
  durationS: number | null;
  costAmount: string | null;
  costCurrency: string | null;
  carrierName: string | null;
  flightNumber: string | null;
  confirmationNumber: string | null;
  seatAssignment: string | null;
  terminal: string | null;
  gate: string | null;
  bookingUrl: string | null;
  notes: string | null;
}

const optZone = () =>
  z.preprocess(blank, z.string().max(64).refine(isIanaZone, "Use a time zone name such as America/Chicago.").nullable());

const optLocalTime = () =>
  z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, "Use a date and time.").nullable());

const optUrl = () =>
  z.preprocess(
    blank,
    z
      .string()
      .max(500, "Keep the link under 500 characters.")
      .refine((v) => {
        try {
          const u = new URL(v);
          return u.protocol === "https:" || u.protocol === "http:";
        } catch {
          return false;
        }
      }, "Use a full link starting with https://.")
      .nullable()
  );

const BAD_ID = "That choice isn't available. Pick again from the list.";

const schema = z.object({
  inputUnits: z.enum(UNIT_SYSTEMS as [UnitSystem, ...UnitSystem[]], { error: "Reload the page and try again." }),
  mode: reqEnum(TRIP_MODES, "Choose how you traveled."),
  status: reqEnum(TRIP_STATUSES, "Choose planned, in progress, done, or cancelled."),
  purpose: optEnum(TRIP_PURPOSES, "Choose a purpose from the list."),
  category: optEnum(TRIP_CATEGORIES, "Choose travel or fitness."),
  vehicleId: optUuid(BAD_ID),
  journeyId: optUuid(BAD_ID),
  startDate: optDate(),
  endDate: optDate(),
  departLocal: optLocalTime(),
  departTz: optZone(),
  arriveLocal: optLocalTime(),
  arriveTz: optZone(),
  originPlaceId: optUuid(BAD_ID),
  originLabel: optText(160),
  destinationPlaceId: optUuid(BAD_ID),
  destinationLabel: optText(160),
  isRoundTrip: checkbox(),
  distance: optNumber(0, 100_000, "Use a distance of zero or more."),
  durationMin: optNumber(0, 100_000, "Use minutes, zero or more."),
  costAmount: optAmount(),
  costCurrency: optCurrency(),
  carrierName: optText(80),
  flightNumber: optText(12),
  confirmationNumber: optText(40),
  seatAssignment: optText(20),
  terminal: optText(20),
  gate: optText(20),
  bookingUrl: optUrl(),
  notes: optText(2000),
});

export function parseTripForm(input: Record<string, unknown>): Parsed<TripInput> {
  const r = schema.safeParse(input);
  if (!r.success) return { ok: false, fieldErrors: collectErrors(r.error) };
  const v = r.data;
  const errors: FieldErrors = {};

  const departedAt = timeAt(v.departLocal, v.departTz, "departTz", errors);
  // An arrival with no zone of its own is in the departure's zone (a bike ride, a drive across town).
  const arriveTz = v.arriveLocal ? (v.arriveTz ?? v.departTz) : v.arriveTz;
  const arrivedAt = timeAt(v.arriveLocal, arriveTz, "arriveTz", errors);
  if (departedAt && arrivedAt && arrivedAt < departedAt) {
    errors.arriveLocal = "Arrival is before departure. Check the times and their time zones.";
  }

  // The trip date can come from the departure: the local calendar date where it departed.
  const startDate = v.startDate ?? (v.departLocal ? v.departLocal.slice(0, 10) : null);
  if (!startDate) errors.startDate = "Add the date of the trip.";
  if (startDate && v.endDate && v.endDate < startDate) errors.endDate = "The end date is before the start date.";

  if (v.costAmount && !v.costCurrency) errors.costCurrency = "Add the currency you paid in.";

  if (Object.keys(errors).length || !startDate) return { ok: false, fieldErrors: errors };

  return {
    ok: true,
    data: {
      mode: v.mode,
      status: v.status,
      purpose: v.purpose,
      // Only human-powered trips can count as fitness (CentenarianOS rule).
      category: HUMAN_POWERED_MODES.has(v.mode) && v.category === "fitness" ? "fitness" : "travel",
      vehicleId: v.vehicleId,
      journeyId: v.journeyId,
      startDate,
      endDate: v.endDate,
      departedAt,
      departTz: departedAt ? v.departTz : null,
      arrivedAt,
      arriveTz: arrivedAt ? arriveTz : null,
      originPlaceId: v.originPlaceId,
      originLabel: v.originLabel,
      destinationPlaceId: v.destinationPlaceId,
      destinationLabel: v.destinationLabel,
      isRoundTrip: v.isRoundTrip,
      distanceM: v.distance == null ? null : toCanonical(v.distance, "distance", v.inputUnits),
      durationS: v.durationMin == null ? null : Math.round(v.durationMin * 60),
      costAmount: v.costAmount,
      // A currency with no amount is just the pre-filled home currency: drop it.
      costCurrency: v.costAmount ? v.costCurrency : null,
      carrierName: v.carrierName,
      flightNumber: v.mode === "plane" && v.flightNumber ? v.flightNumber.toUpperCase().replace(/\s+/g, " ") : null,
      confirmationNumber: v.confirmationNumber,
      seatAssignment: v.seatAssignment,
      terminal: v.terminal,
      gate: v.gate,
      bookingUrl: v.bookingUrl,
      notes: v.notes,
    },
  };
}

function timeAt(local: string | null, zone: string | null, zoneField: string, errors: FieldErrors): Date | null {
  if (!local) return null;
  if (!zone) {
    errors[zoneField] = "Pick the time zone for this time.";
    return null;
  }
  const at = zonedLocalToUtc(local, zone);
  if (!at) errors[zoneField] = "That time doesn't exist in this time zone.";
  return at;
}
