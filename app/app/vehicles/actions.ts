"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { vehicles } from "@/db/schema";
import { NOT_FOUND, databaseFailure, requireMobilityOwner } from "@/lib/mobility/action-kit";
import { formToRecord, isUuid } from "@/lib/mobility/form-kit";
import { INVALID, type FormState } from "@/lib/mobility/form-state";
import { parseVehicleForm } from "@/lib/mobility/vehicle-form";

export async function createVehicle(_prev: FormState, formData: FormData): Promise<FormState> {
  const owner = await requireMobilityOwner();
  if (!owner.ok) return owner.state;
  const parsed = parseVehicleForm(formToRecord(formData));
  if (!parsed.ok) return INVALID(parsed.fieldErrors);
  try {
    await getDb()
      .insert(vehicles)
      .values({ ...parsed.data, userId: owner.ctx.user.id });
  } catch (err) {
    return databaseFailure("create vehicle", err);
  }
  revalidatePath("/app", "layout");
  redirect("/app/vehicles?saved=1");
}

export async function updateVehicle(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const owner = await requireMobilityOwner();
  if (!owner.ok) return owner.state;
  if (!isUuid(id)) return NOT_FOUND;
  const parsed = parseVehicleForm(formToRecord(formData));
  if (!parsed.ok) return INVALID(parsed.fieldErrors);
  try {
    const rows = await getDb()
      .update(vehicles)
      .set({ ...parsed.data, updatedAt: sql`now()` })
      .where(and(eq(vehicles.id, id), eq(vehicles.userId, owner.ctx.user.id)))
      .returning({ id: vehicles.id });
    if (!rows.length) return NOT_FOUND;
  } catch (err) {
    return databaseFailure("update vehicle", err);
  }
  revalidatePath("/app", "layout");
  return { ok: true, message: "Saved." };
}

/** Trips keep their history: the vehicle link becomes empty (ON DELETE SET NULL). */
export async function deleteVehicle(id: string): Promise<FormState> {
  const owner = await requireMobilityOwner();
  if (!owner.ok) return owner.state;
  if (!isUuid(id)) return NOT_FOUND;
  try {
    const rows = await getDb()
      .delete(vehicles)
      .where(and(eq(vehicles.id, id), eq(vehicles.userId, owner.ctx.user.id)))
      .returning({ id: vehicles.id });
    if (!rows.length) return NOT_FOUND;
  } catch (err) {
    return databaseFailure("delete vehicle", err);
  }
  revalidatePath("/app", "layout");
  redirect("/app/vehicles?deleted=1");
}
