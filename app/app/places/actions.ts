"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { places } from "@/db/schema";
import { NOT_FOUND, databaseFailure, requireMobilityOwner } from "@/lib/mobility/action-kit";
import { formToRecord, isUuid } from "@/lib/mobility/form-kit";
import { INVALID, type FormState } from "@/lib/mobility/form-state";
import { parsePlaceForm, type PlaceInput } from "@/lib/mobility/place-form";
import { findAliasConflict, normalizePlaceName } from "@/lib/mobility/places";

/** Refuse a place that would answer to the same name as another of the owner's places. */
async function aliasConflict(userId: string, input: PlaceInput, selfId: string | null): Promise<FormState | null> {
  const existing = await getDb()
    .select({ id: places.id, label: places.label, kind: places.kind, aliases: places.aliases })
    .from(places)
    .where(eq(places.userId, userId));
  const clash = findAliasConflict(input, existing, selfId);
  if (!clash) return null;
  const field = clash.name === normalizePlaceName(input.label) ? "label" : "aliases";
  return INVALID({ [field]: `"${clash.label}" already answers to that name. Edit that place instead, or use a different name.` });
}

export async function createPlace(_prev: FormState, formData: FormData): Promise<FormState> {
  const owner = await requireMobilityOwner();
  if (!owner.ok) return owner.state;
  const parsed = parsePlaceForm(formToRecord(formData));
  if (!parsed.ok) return INVALID(parsed.fieldErrors);
  const userId = owner.ctx.user.id;
  try {
    const conflict = await aliasConflict(userId, parsed.data, null);
    if (conflict) return conflict;
    await getDb()
      .insert(places)
      .values({ ...parsed.data, userId });
  } catch (err) {
    return databaseFailure("create place", err);
  }
  revalidatePath("/app", "layout");
  redirect("/app/places?saved=1");
}

export async function updatePlace(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const owner = await requireMobilityOwner();
  if (!owner.ok) return owner.state;
  if (!isUuid(id)) return NOT_FOUND;
  const parsed = parsePlaceForm(formToRecord(formData));
  if (!parsed.ok) return INVALID(parsed.fieldErrors);
  const userId = owner.ctx.user.id;
  try {
    const conflict = await aliasConflict(userId, parsed.data, id);
    if (conflict) return conflict;
    const rows = await getDb()
      .update(places)
      .set({ ...parsed.data, updatedAt: sql`now()` })
      .where(and(eq(places.id, id), eq(places.userId, userId)))
      .returning({ id: places.id });
    if (!rows.length) return NOT_FOUND;
  } catch (err) {
    return databaseFailure("update place", err);
  }
  revalidatePath("/app", "layout");
  return { ok: true, message: "Saved." };
}

/** Trips keep the place's name as text (origin_label / destination_label); the link is cleared. */
export async function deletePlace(id: string): Promise<FormState> {
  const owner = await requireMobilityOwner();
  if (!owner.ok) return owner.state;
  if (!isUuid(id)) return NOT_FOUND;
  try {
    const rows = await getDb()
      .delete(places)
      .where(and(eq(places.id, id), eq(places.userId, owner.ctx.user.id)))
      .returning({ id: places.id });
    if (!rows.length) return NOT_FOUND;
  } catch (err) {
    return databaseFailure("delete place", err);
  }
  revalidatePath("/app", "layout");
  redirect("/app/places?deleted=1");
}
