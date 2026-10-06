import { describe, expect, it } from "vitest";
import { placeKind, tripCategory, tripMode, tripPurpose, tripStatus, vehicleEnergy, vehicleKind, vehicleOwnership } from "@/db/schema";
import {
  PLACE_KINDS,
  TRIP_CATEGORIES,
  TRIP_MODES,
  TRIP_PURPOSES,
  TRIP_STATUSES,
  VEHICLE_ENERGY,
  VEHICLE_KINDS,
  VEHICLE_OWNERSHIP,
} from "./options";

const same = (a: readonly string[], b: readonly string[]) => expect([...a].sort()).toEqual([...b].sort());

describe("form options match the database enums", () => {
  it("vehicles", () => {
    same(VEHICLE_KINDS, vehicleKind.enumValues);
    same(VEHICLE_OWNERSHIP, vehicleOwnership.enumValues);
    same(VEHICLE_ENERGY, vehicleEnergy.enumValues);
  });

  it("trips", () => {
    same(TRIP_MODES, tripMode.enumValues);
    same(TRIP_STATUSES, tripStatus.enumValues);
    same(TRIP_PURPOSES, tripPurpose.enumValues);
    same(TRIP_CATEGORIES, tripCategory.enumValues);
  });

  it("places", () => {
    same(PLACE_KINDS, placeKind.enumValues);
  });
});
