/**
 * Trip CO2 estimate, ported from CentenarianOS `lib/travel/constants.ts` (CO2_PER_MILE, kg per
 * mile), converted to kg per kilometer because RideWitUS stores meters. Only the modes that
 * CentenarianOS has a factor for get one; e-bike, scooter, motorcycle and taxi have no factor
 * here yet, and get no estimate rather than a guessed one. Pure.
 */
import { METERS_PER_MILE } from "@/lib/units/convert";
import type { TripMode } from "./options";

const CENTOS_KG_PER_MILE: Partial<Record<TripMode, number>> = {
  plane: 0.255,
  car: 0.17,
  rideshare: 0.17,
  bus: 0.089,
  train: 0.041,
  ferry: 0.12,
  bike: 0,
  walk: 0,
  run: 0,
};

/** kg CO2 for a trip, doubled for a round trip; null when the mode has no factor or no distance. */
export function estimateCo2Kg(mode: TripMode, distanceM: number | null, isRoundTrip: boolean): number | null {
  const perMile = CENTOS_KG_PER_MILE[mode];
  if (perMile == null || distanceM == null || !(distanceM > 0)) return null;
  const miles = (distanceM / METERS_PER_MILE) * (isRoundTrip ? 2 : 1);
  return Math.round(perMile * miles * 1000) / 1000;
}
