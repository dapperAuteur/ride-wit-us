"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { userSettings } from "@/db/schema";
import { getMobilityContext } from "@/lib/mobility/context";
import { parseSettings, type MobilitySettings, type SettingsFieldErrors } from "@/lib/mobility/settings-schema";

export type SaveSettingsState =
  | { ok: true; data: MobilitySettings }
  | { ok: false; error: string; code: string; fieldErrors?: SettingsFieldErrors }
  | null;

/** Save the signed-in user's defaults. Returns the ecosystem envelope; never throws to the client. */
export async function saveSettings(_prev: SaveSettingsState, formData: FormData): Promise<SaveSettingsState> {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") {
    return { ok: false, error: "Settings aren't available right now.", code: ctx.state };
  }

  const parsed = parseSettings({
    unitSystem: formData.get("unitSystem"),
    homeCurrency: formData.get("homeCurrency") ?? "",
    timeZone: formData.get("timeZone") ?? "",
  });
  if (!parsed.ok) {
    return { ok: false, error: "Check the highlighted fields.", code: "invalid_input", fieldErrors: parsed.fieldErrors };
  }

  try {
    await getDb()
      .insert(userSettings)
      .values({ userId: ctx.user.id, ...parsed.data })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { ...parsed.data, updatedAt: sql`now()` },
      });
  } catch (err) {
    console.error("[mobility] save settings failed err=%s", err instanceof Error ? err.name : "UnknownError");
    return { ok: false, error: "Couldn't save. Try again in a minute.", code: "database_error" };
  }

  revalidatePath("/app", "layout");
  return { ok: true, data: parsed.data };
}
