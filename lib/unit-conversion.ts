// Conversion constants
export const MILES_TO_KM = 1.60934
export const KM_TO_MILES = 0.621371

// Convert miles to kilometers
export function milesToKm(miles: number): number {
  return miles * MILES_TO_KM
}

// Convert kilometers to miles
export function kmToMiles(km: number): number {
  return km * KM_TO_MILES
}

// Format distance with the appropriate unit
export function formatDistance(distance: number, unit: "miles" | "km"): string {
  return `${distance.toFixed(1)} ${unit}`
}

// Convert distance based on the unit
export function convertDistance(distance: number, fromUnit: "miles" | "km", toUnit: "miles" | "km"): number {
  if (fromUnit === toUnit) return distance
  return fromUnit === "miles" ? milesToKm(distance) : kmToMiles(distance)
}

