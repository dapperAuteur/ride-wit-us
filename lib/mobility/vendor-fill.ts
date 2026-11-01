/**
 * Picking a vendor on the trip form fills the trip from it (BAM, 2026-11-01: "will choosing vendor
 * populate address, distance, and other vendor data to trip? it should"). Pure, so the rules are
 * tested without a browser.
 *
 * WHAT IS FILLED, AND ONLY WHEN THE FIELD IS STILL EMPTY (nothing the rider typed is replaced):
 *  - "To": the saved place the vendor matches (by name, location, or address), else the vendor's
 *    name and location with its address as typed text, which the rider can edit before saving.
 *  - "Distance": a straight-line estimate, only when both ends are saved places with coordinates.
 *    CentenarianOS's vendor API returns no coordinates (PRD §6.9), so a vendor that matches no
 *    saved place gets no estimate. Straight-line is shorter than the road; the form says so.
 *
 * WHAT IS NOT FILLED: purpose and category. A vendor's CentenarianOS category is a budget category
 * ("Auto", "Fuel"), which says what was bought, not why the trip was made; a guess would be wrong
 * as often as right.
 *
 * Nothing here is stored. The filled text is saved only if the rider submits the trip with it.
 */
import { matchPlace, normalizePlaceName, type PlaceLike } from "./places";

/** What the trip form may use from a picked vendor (read on the server from CentenarianOS). */
export interface VendorTripFill {
  /** "Shell on Main · Main St": the same label the picker shows. */
  label: string;
  name: string;
  locationLabel: string | null;
  address: string | null;
}

/** A saved place as the trip form knows it: enough to match a vendor and measure a distance. */
export interface FillPlace extends PlaceLike {
  address: string | null;
  lat: number | null;
  lng: number | null;
}

/** The trip form's "To" free-text limit (lib/mobility/trip-form.ts). */
export const DESTINATION_LABEL_MAX = 160;

/** Mean Earth radius in meters (IUGG). */
const EARTH_RADIUS_M = 6_371_008.8;

/** Great-circle distance between two points, in meters. */
export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The typed "To" text for a vendor: "Shell on Main · Main St, 100 Main St", cut to fit. */
export function vendorDestinationText(fill: VendorTripFill): string {
  const text = fill.address ? `${fill.label}, ${fill.address}` : fill.label;
  return text.length > DESTINATION_LABEL_MAX ? text.slice(0, DESTINATION_LABEL_MAX).trimEnd() : text;
}

/** The saved place a vendor is, if any: by label or alias, or by the place's own address. */
export function matchVendorPlace<P extends FillPlace>(fill: VendorTripFill, places: readonly P[]): P | null {
  const names = [
    fill.label,
    fill.name,
    fill.locationLabel ? `${fill.name} ${fill.locationLabel}` : null,
    fill.address,
    fill.address ? `${fill.label}, ${fill.address}` : null,
  ];
  for (const n of names) {
    const hit = matchPlace(n, places);
    if (hit) return hit;
  }
  const address = fill.address ? normalizePlaceName(fill.address) : "";
  if (!address) return null;
  return places.find((p) => p.address && normalizePlaceName(p.address) === address) ?? null;
}

function hasCoords(p: FillPlace | null | undefined): p is FillPlace & { lat: number; lng: number } {
  return !!p && typeof p.lat === "number" && typeof p.lng === "number";
}

export interface FillInput {
  fill: VendorTripFill;
  places: readonly FillPlace[];
  /** The "From" saved place, if one is chosen. */
  originPlaceId: string | null;
  /** The "To" field as it stands: a chosen saved place, or typed text. */
  destination: { placeId: string | null; label: string };
  /** The distance field's text as it stands. */
  distanceText: string;
}

export interface FillPlan {
  /** Set "To" to this saved place, or to this typed text. Null: leave "To" as it is. */
  destination: { placeId: string } | { label: string } | null;
  /** A straight-line estimate to put in an empty distance field. */
  estimate: { meters: number; from: string; to: string } | null;
  /** Field names filled, for the note under the picker. */
  filled: string[];
  /** Field names left alone because the rider had already filled them. */
  kept: string[];
}

export function planVendorFill(input: FillInput): FillPlan {
  const { fill, places, originPlaceId, destination, distanceText } = input;
  const filled: string[] = [];
  const kept: string[] = [];

  const destinationEmpty = !destination.placeId && !destination.label.trim();
  const matched = matchVendorPlace(fill, places);
  let destinationPlan: FillPlan["destination"] = null;
  let destinationPlace: FillPlace | null = null;
  if (destinationEmpty) {
    destinationPlan = matched ? { placeId: matched.id } : { label: vendorDestinationText(fill) };
    destinationPlace = matched;
    filled.push("To");
  } else {
    kept.push("To");
    destinationPlace = destination.placeId ? (places.find((p) => p.id === destination.placeId) ?? null) : null;
  }

  let estimate: FillPlan["estimate"] = null;
  const origin = originPlaceId ? places.find((p) => p.id === originPlaceId) : null;
  if (distanceText.trim()) {
    kept.push("Distance");
  } else if (hasCoords(origin) && hasCoords(destinationPlace) && origin.id !== destinationPlace.id) {
    estimate = { meters: haversineMeters(origin, destinationPlace), from: origin.label, to: destinationPlace.label };
    filled.push("Distance");
  }

  return { destination: destinationPlan, estimate, filled, kept };
}
