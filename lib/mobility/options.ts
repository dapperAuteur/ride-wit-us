/**
 * Option lists and labels for the mobility forms. Kept as plain literals (not imported from
 * db/schema) so client components don't pull Drizzle into the browser bundle;
 * lib/mobility/options.test.ts asserts they match the database enums.
 */

export const VEHICLE_KINDS = ["car", "motorcycle", "bike", "ebike", "scooter", "shoes", "other"] as const;
export type VehicleKind = (typeof VEHICLE_KINDS)[number];
export const VEHICLE_KIND_LABELS: Record<VehicleKind, string> = {
  car: "Car",
  motorcycle: "Motorcycle",
  bike: "Bike",
  ebike: "E-bike",
  scooter: "Scooter",
  shoes: "Shoes",
  other: "Other",
};

export const VEHICLE_OWNERSHIP = ["owned", "rental", "borrowed", "shared"] as const;
export type VehicleOwnership = (typeof VEHICLE_OWNERSHIP)[number];
export const VEHICLE_OWNERSHIP_LABELS: Record<VehicleOwnership, string> = {
  owned: "Owned",
  rental: "Rented",
  borrowed: "Borrowed",
  shared: "Shared",
};

export const VEHICLE_ENERGY = ["gasoline", "diesel", "electric", "hybrid", "plug_in_hybrid", "human"] as const;
export type VehicleEnergy = (typeof VEHICLE_ENERGY)[number];
export const VEHICLE_ENERGY_LABELS: Record<VehicleEnergy, string> = {
  gasoline: "Gasoline",
  diesel: "Diesel",
  electric: "Electric",
  hybrid: "Hybrid",
  plug_in_hybrid: "Plug-in hybrid",
  human: "Human-powered",
};

export const TRIP_MODES = [
  "car",
  "bike",
  "ebike",
  "scooter",
  "walk",
  "run",
  "motorcycle",
  "bus",
  "train",
  "plane",
  "ferry",
  "rideshare",
  "taxi",
  "other",
] as const;
export type TripMode = (typeof TRIP_MODES)[number];
export const TRIP_MODE_LABELS: Record<TripMode, string> = {
  car: "Car",
  bike: "Bike",
  ebike: "E-bike",
  scooter: "Scooter",
  walk: "Walk",
  run: "Run",
  motorcycle: "Motorcycle",
  bus: "Bus",
  train: "Train",
  plane: "Plane",
  ferry: "Ferry",
  rideshare: "Rideshare",
  taxi: "Taxi",
  other: "Other",
};

/** Modes whose trips can count as fitness (CentenarianOS HUMAN_POWERED, plus e-bike). */
export const HUMAN_POWERED_MODES: ReadonlySet<TripMode> = new Set<TripMode>(["bike", "ebike", "walk", "run"]);

/** Modes that usually come with a booking: carrier, confirmation, seat. */
export const BOOKED_MODES: ReadonlySet<TripMode> = new Set<TripMode>(["plane", "train", "bus", "ferry", "rideshare"]);

export const TRIP_STATUSES = ["planned", "in_progress", "completed", "cancelled"] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];
export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Done",
  cancelled: "Cancelled",
};

/** Every stored purpose. `leisure` and `exercise` arrive with CentenarianOS rows. */
export const TRIP_PURPOSES = ["personal", "commute", "work", "errand", "exercise", "leisure", "other"] as const;
export type TripPurpose = (typeof TRIP_PURPOSES)[number];
export const TRIP_PURPOSE_LABELS: Record<TripPurpose, string> = {
  personal: "Personal",
  commute: "Commute",
  work: "Work",
  errand: "Errand",
  exercise: "Exercise",
  leisure: "Leisure",
  other: "Other",
};
/** What a new trip offers; a stored legacy purpose is still shown when editing. */
export const FORM_TRIP_PURPOSES: readonly TripPurpose[] = ["personal", "commute", "work", "errand", "other"];

export const TRIP_CATEGORIES = ["travel", "fitness"] as const;
export type TripCategory = (typeof TRIP_CATEGORIES)[number];

export const PLACE_KINDS = ["home", "work", "gym", "venue", "other"] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number];
export const PLACE_KIND_LABELS: Record<PlaceKind, string> = {
  home: "Home",
  work: "Work",
  gym: "Gym",
  venue: "Venue",
  other: "Other",
};
