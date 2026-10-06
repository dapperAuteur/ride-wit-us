/**
 * Saved-place form validation. Pure; the alias-conflict check against the user's other places is
 * findAliasConflict() in ./places, run by the action once it has loaded them.
 */
import { z } from "zod";
import { collectErrors, optNumber, optText, reqEnum, reqText, type Parsed } from "./form-kit";
import { PLACE_KINDS, type PlaceKind } from "./options";
import { parseAliases } from "./places";

export interface PlaceInput {
  label: string;
  kind: PlaceKind;
  address: string | null;
  lat: number | null;
  lng: number | null;
  aliases: string[];
}

const schema = z
  .object({
    label: reqText(80, "Give the place a name, for example Home or Blue Note."),
    kind: reqEnum(PLACE_KINDS, "Choose what kind of place this is."),
    address: optText(240),
    lat: optNumber(-90, 90, "Latitude runs from -90 to 90."),
    lng: optNumber(-180, 180, "Longitude runs from -180 to 180."),
    aliases: z.preprocess((v) => (typeof v === "string" ? v : ""), z.string().max(2400, "That's too many aliases.")),
  })
  .superRefine((v, ctx) => {
    if ((v.lat == null) !== (v.lng == null)) {
      ctx.addIssue({ code: "custom", path: [v.lat == null ? "lat" : "lng"], message: "Add both latitude and longitude, or neither." });
    }
  });

export function parsePlaceForm(input: Record<string, unknown>): Parsed<PlaceInput> {
  const r = schema.safeParse(input);
  if (!r.success) return { ok: false, fieldErrors: collectErrors(r.error) };
  const v = r.data;
  return {
    ok: true,
    data: { label: v.label, kind: v.kind, address: v.address, lat: v.lat, lng: v.lng, aliases: parseAliases(v.aliases, v.label) },
  };
}
