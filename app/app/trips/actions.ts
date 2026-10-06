"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { places, trips } from "@/db/schema";
import { NOT_FOUND, databaseFailure, refusedReference, requireMobilityOwner } from "@/lib/mobility/action-kit";
import { estimateCo2Kg } from "@/lib/mobility/co2";
import { formToRecord, isUuid } from "@/lib/mobility/form-kit";
import { INVALID, type FormState } from "@/lib/mobility/form-state";
import { nextLegOrder } from "@/lib/mobility/grouping";
import { verifyOwnedRefs } from "@/lib/mobility/ownership";
import { ownedIdLoader } from "@/lib/mobility/ownership-db";
import { resolvePlaceRef } from "@/lib/mobility/places";
import { parseTripForm, type TripInput } from "@/lib/mobility/trip-form";

type TripValues = Omit<typeof trips.$inferInsert, "userId" | "id">;

/**
 * Check every referenced id belongs to the owner, resolve typed place names to saved places, and
 * compute the CO2 estimate. Returns the row values, or the envelope to send back.
 */
async function prepareTrip(userId: string, data: TripInput): Promise<{ ok: true; values: TripValues } | { ok: false; state: FormState }> {
  const check = await verifyOwnedRefs(
    {
      vehicle: [data.vehicleId],
      place: [data.originPlaceId, data.destinationPlaceId],
      journey: [data.journeyId],
    },
    ownedIdLoader(userId)
  );
  if (!check.ok) {
    const field =
      check.kind === "vehicle"
        ? "vehicleId"
        : check.kind === "journey"
          ? "journeyId"
          : check.id === data.originPlaceId
            ? "originPlaceId"
            : "destinationPlaceId";
    return { ok: false, state: refusedReference(check, field) };
  }

  const owned = await getDb()
    .select({ id: places.id, label: places.label, kind: places.kind, aliases: places.aliases })
    .from(places)
    .where(eq(places.userId, userId));
  const origin = resolvePlaceRef(data.originPlaceId, data.originLabel, owned);
  const destination = resolvePlaceRef(data.destinationPlaceId, data.destinationLabel, owned);

  return {
    ok: true,
    values: {
      ...data,
      originPlaceId: origin.placeId,
      originLabel: origin.label,
      destinationPlaceId: destination.placeId,
      destinationLabel: destination.label,
      co2Kg: estimateCo2Kg(data.mode, data.distanceM, data.isRoundTrip),
      distanceSource: data.distanceM == null ? null : "manual",
    },
  };
}

export async function createTrip(_prev: FormState, formData: FormData): Promise<FormState> {
  const owner = await requireMobilityOwner();
  if (!owner.ok) return owner.state;
  const parsed = parseTripForm(formToRecord(formData));
  if (!parsed.ok) return INVALID(parsed.fieldErrors);
  const userId = owner.ctx.user.id;
  try {
    const prepared = await prepareTrip(userId, parsed.data);
    if (!prepared.ok) return prepared.state;
    let legOrder: number | null = null;
    if (parsed.data.journeyId) {
      const legs = await getDb()
        .select({ legOrder: trips.legOrder })
        .from(trips)
        .where(and(eq(trips.journeyId, parsed.data.journeyId), eq(trips.userId, userId)));
      legOrder = nextLegOrder(legs);
    }
    await getDb()
      .insert(trips)
      .values({ ...prepared.values, legOrder, userId });
  } catch (err) {
    return databaseFailure("create trip", err);
  }
  revalidatePath("/app", "layout");
  redirect(parsed.data.journeyId ? `/app/journeys/${parsed.data.journeyId}?saved=leg` : "/app/trips?saved=1");
}

/** A leg stays in its journey: moving legs between journeys isn't offered, so journey_id is not updated. */
export async function updateTrip(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const owner = await requireMobilityOwner();
  if (!owner.ok) return owner.state;
  if (!isUuid(id)) return NOT_FOUND;
  const parsed = parseTripForm(formToRecord(formData));
  if (!parsed.ok) return INVALID(parsed.fieldErrors);
  const userId = owner.ctx.user.id;
  try {
    const prepared = await prepareTrip(userId, { ...parsed.data, journeyId: null });
    if (!prepared.ok) return prepared.state;
    const { journeyId: _ignored, ...values } = prepared.values;
    void _ignored;
    const rows = await getDb()
      .update(trips)
      .set({ ...values, updatedAt: sql`now()` })
      .where(and(eq(trips.id, id), eq(trips.userId, userId)))
      .returning({ id: trips.id });
    if (!rows.length) return NOT_FOUND;
  } catch (err) {
    return databaseFailure("update trip", err);
  }
  revalidatePath("/app", "layout");
  return { ok: true, message: "Saved." };
}

export async function deleteTrip(id: string): Promise<FormState> {
  const owner = await requireMobilityOwner();
  if (!owner.ok) return owner.state;
  if (!isUuid(id)) return NOT_FOUND;
  let journeyId: string | null = null;
  try {
    const rows = await getDb()
      .delete(trips)
      .where(and(eq(trips.id, id), eq(trips.userId, owner.ctx.user.id)))
      .returning({ id: trips.id, journeyId: trips.journeyId });
    if (!rows.length) return NOT_FOUND;
    journeyId = rows[0].journeyId;
  } catch (err) {
    return databaseFailure("delete trip", err);
  }
  revalidatePath("/app", "layout");
  redirect(journeyId ? `/app/journeys/${journeyId}?deleted=leg` : "/app/trips?deleted=1");
}
