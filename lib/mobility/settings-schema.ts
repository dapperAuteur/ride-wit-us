/**
 * Validation for the mobility settings form. Pure (zod only) so it is shared by the server action
 * and the tests.
 */
import { z } from "zod";
import { UNIT_SYSTEMS, type UnitSystem } from "@/lib/units/convert";

export interface MobilitySettings {
  unitSystem: UnitSystem;
  /** ISO 4217, upper case, or null when the user has not picked one. */
  homeCurrency: string | null;
  /** IANA zone, or null to use the browser's. */
  timeZone: string | null;
}

/** Shown before the user saves anything. Imperial matches the miles CentenarianOS stored. */
export const DEFAULT_SETTINGS: MobilitySettings = {
  unitSystem: "imperial",
  homeCurrency: null,
  timeZone: null,
};

function isIanaZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const settingsSchema = z.object({
  unitSystem: z.enum(UNIT_SYSTEMS as [UnitSystem, ...UnitSystem[]], {
    error: "Choose metric or imperial.",
  }),
  homeCurrency: z.preprocess(
    blankToNull,
    z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .pipe(z.string().regex(/^[A-Z]{3}$/, "Use a three-letter currency code, for example USD or MXN."))
      .nullable()
  ),
  timeZone: z.preprocess(
    blankToNull,
    z
      .string()
      .trim()
      .max(64)
      .refine(isIanaZone, "Use a time zone name such as America/Chicago.")
      .nullable()
  ),
});

export type SettingsFieldErrors = Partial<Record<keyof MobilitySettings, string>>;

export type ParsedSettings =
  | { ok: true; data: MobilitySettings }
  | { ok: false; fieldErrors: SettingsFieldErrors };

export function parseSettings(input: Record<string, unknown>): ParsedSettings {
  const result = settingsSchema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: SettingsFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof MobilitySettings | undefined;
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, fieldErrors };
}
