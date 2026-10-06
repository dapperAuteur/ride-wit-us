/**
 * A stored trip → the values its edit form starts from. Instants go back to wall-clock time in
 * the zone they were entered in. Pure.
 */
import { utcToZonedLocal } from "./zoned-time";

export interface StoredTrip {
  mode: string;
  status: string;
  purpose: string | null;
  category: string;
  vehicleId: string | null;
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

export function tripFormValues(t: StoredTrip) {
  return {
    mode: t.mode,
    status: t.status,
    purpose: t.purpose,
    category: t.category,
    vehicleId: t.vehicleId,
    startDate: t.startDate,
    endDate: t.endDate,
    departLocal: t.departedAt ? utcToZonedLocal(t.departedAt, t.departTz ?? "UTC") : null,
    departTz: t.departedAt ? (t.departTz ?? "UTC") : null,
    arriveLocal: t.arrivedAt ? utcToZonedLocal(t.arrivedAt, t.arriveTz ?? "UTC") : null,
    arriveTz: t.arrivedAt ? (t.arriveTz ?? "UTC") : null,
    originPlaceId: t.originPlaceId,
    originLabel: t.originLabel,
    destinationPlaceId: t.destinationPlaceId,
    destinationLabel: t.destinationLabel,
    isRoundTrip: t.isRoundTrip,
    distanceM: t.distanceM,
    durationS: t.durationS,
    costAmount: t.costAmount,
    costCurrency: t.costCurrency,
    carrierName: t.carrierName,
    flightNumber: t.flightNumber,
    confirmationNumber: t.confirmationNumber,
    seatAssignment: t.seatAssignment,
    terminal: t.terminal,
    gate: t.gate,
    bookingUrl: t.bookingUrl,
    notes: t.notes,
  };
}
