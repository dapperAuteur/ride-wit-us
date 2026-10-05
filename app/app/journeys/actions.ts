"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { journeys, lodgingStays } from "@/db/schema";
import { NOT_FOUND, databaseFailure, refusedReference, requireMobilityOwner } from "@/lib/mobility/action-kit";
import { formToRecord, isUuid } from "@/lib/mobility/form-kit";
import { INVALID, type FormState } from "@/lib/mobility/form-state";
import { parseJourneyForm, parseStayForm } from "@/lib/mobility/journey-form";
import { verifyOwnedRefs } from "@/lib/mobility/ownership";
import { ownedIdLoader } from "@/lib/mobility/ownership-db";

export async function createJourney(_prev: FormState, formData: FormData): Promise<FormState> {
  const owner = await requireMobilityOwner();
  if (!owner.ok) return owner.state;
  const parsed = parseJourneyForm(formToRecord(formData));
  if (!parsed.ok) return INVALID(parsed.fieldErrors);
  let id: string;
  try {
    const [row] = await getDb()
      .insert(journeys)
      .values({ ...parsed.data, userId: owner.ctx.user.id })
      .returning({ id: journeys.id });
    id = row.id;
  } catch (err) {
    return databaseFailure("create journey", err);
  }
  revalidatePath("/app", "layout");
  redirect(`/app/journeys/${id}?saved=journey`);
}

export async function updateJourney(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const owner = await requireMobilityOwner();
  if (!owner.ok) return owner.state;
  if (!isUuid(id)) return NOT_FOUND;
  const parsed = parseJourneyForm(formToRecord(formData));
  if (!parsed.ok) return INVALID(parsed.fieldErrors);
  try {
    const rows = await getDb()
      .update(journeys)
      .set({ ...parsed.data, updatedAt: sql`now()` })
      .where(and(eq(journeys.id, id), eq(journeys.userId, owner.ctx.user.id)))
      .returning({ id: journeys.id });
    if (!rows.length) return NOT_FOUND;
  } catch (err) {
    return databaseFailure("update journey", err);
  }
  revalidatePath("/app", "layout");
  redirect(`/app/journeys/${id}?saved=journey`);
}

/** Deletes the journey with its legs and stays (ON DELETE CASCADE). */
export async function deleteJourney(id: string): Promise<FormState> {
  const owner = await requireMobilityOwner();
  if (!owner.ok) return owner.state;
  if (!isUuid(id)) return NOT_FOUND;
  try {
    const rows = await getDb()
      .delete(journeys)
      .where(and(eq(journeys.id, id), eq(journeys.userId, owner.ctx.user.id)))
      .returning({ id: journeys.id });
    if (!rows.length) return NOT_FOUND;
  } catch (err) {
    return databaseFailure("delete journey", err);
  }
  revalidatePath("/app", "layout");
  redirect("/app/trips?deleted=1");
}

export async function createStay(journeyId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const owner = await requireMobilityOwner();
  if (!owner.ok) return owner.state;
  if (!isUuid(journeyId)) return NOT_FOUND;
  const parsed = parseStayForm(formToRecord(formData));
  if (!parsed.ok) return INVALID(parsed.fieldErrors);
  const userId = owner.ctx.user.id;
  try {
    const check = await verifyOwnedRefs({ journey: [journeyId], place: [parsed.data.placeId] }, ownedIdLoader(userId));
    if (!check.ok) return check.kind === "journey" ? NOT_FOUND : refusedReference(check, "placeId");
    await getDb()
      .insert(lodgingStays)
      .values({ ...parsed.data, journeyId, userId });
  } catch (err) {
    return databaseFailure("create stay", err);
  }
  revalidatePath("/app", "layout");
  redirect(`/app/journeys/${journeyId}?saved=stay`);
}

/** A stay stays in its journey; only its own fields change. */
export async function updateStay(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const owner = await requireMobilityOwner();
  if (!owner.ok) return owner.state;
  if (!isUuid(id)) return NOT_FOUND;
  const parsed = parseStayForm(formToRecord(formData));
  if (!parsed.ok) return INVALID(parsed.fieldErrors);
  const userId = owner.ctx.user.id;
  let journeyId: string;
  try {
    const check = await verifyOwnedRefs({ place: [parsed.data.placeId] }, ownedIdLoader(userId));
    if (!check.ok) return refusedReference(check, "placeId");
    const rows = await getDb()
      .update(lodgingStays)
      .set({ ...parsed.data, updatedAt: sql`now()` })
      .where(and(eq(lodgingStays.id, id), eq(lodgingStays.userId, userId)))
      .returning({ journeyId: lodgingStays.journeyId });
    if (!rows.length) return NOT_FOUND;
    journeyId = rows[0].journeyId;
  } catch (err) {
    return databaseFailure("update stay", err);
  }
  revalidatePath("/app", "layout");
  redirect(`/app/journeys/${journeyId}?saved=stay`);
}

export async function deleteStay(id: string): Promise<FormState> {
  const owner = await requireMobilityOwner();
  if (!owner.ok) return owner.state;
  if (!isUuid(id)) return NOT_FOUND;
  let journeyId: string;
  try {
    const rows = await getDb()
      .delete(lodgingStays)
      .where(and(eq(lodgingStays.id, id), eq(lodgingStays.userId, owner.ctx.user.id)))
      .returning({ journeyId: lodgingStays.journeyId });
    if (!rows.length) return NOT_FOUND;
    journeyId = rows[0].journeyId;
  } catch (err) {
    return databaseFailure("delete stay", err);
  }
  revalidatePath("/app", "layout");
  redirect(`/app/journeys/${journeyId}?deleted=stay`);
}
