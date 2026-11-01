import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { trips, vendorRefs } from "@/db/schema";
import { isUuid } from "./form-kit";

/**
 * The user's pointers to CentenarianOS vendors (`vendor_refs`, migration 0000): a contact id and an
 * optional location id, never a name or address (PRD §5.11). Owner-scoped like every other query.
 */
export type VendorRefRow = typeof vendorRefs.$inferSelect;

export function listVendorRefs(userId: string): Promise<VendorRefRow[]> {
  return getDb().select().from(vendorRefs).where(eq(vendorRefs.userId, userId)).orderBy(desc(vendorRefs.createdAt));
}

export async function getVendorRef(userId: string, id: string): Promise<VendorRefRow | null> {
  if (!isUuid(id)) return null;
  const [row] = await getDb()
    .select()
    .from(vendorRefs)
    .where(and(eq(vendorRefs.id, id), eq(vendorRefs.userId, userId)))
    .limit(1);
  return row ?? null;
}

/**
 * The ref for (contact, location), created if new. The unique key treats a null location as a
 * value (NULLS NOT DISTINCT), so linking the same vendor twice returns the same row.
 */
export async function upsertVendorRef(userId: string, contactId: string, locationId: string | null): Promise<VendorRefRow> {
  const db = getDb();
  const [inserted] = await db
    .insert(vendorRefs)
    .values({ userId, centosContactId: contactId, centosLocationId: locationId })
    .onConflictDoNothing()
    .returning();
  if (inserted) return inserted;
  const [existing] = await db
    .select()
    .from(vendorRefs)
    .where(
      and(
        eq(vendorRefs.userId, userId),
        eq(vendorRefs.centosContactId, contactId),
        locationId ? eq(vendorRefs.centosLocationId, locationId) : isNull(vendorRefs.centosLocationId)
      )
    )
    .limit(1);
  if (!existing) throw new Error("vendor ref upsert returned no row");
  return existing;
}

/** Remove the pointer. Trips that used it keep everything else (trips.vendor_ref_id is ON DELETE SET NULL). */
export async function deleteVendorRef(userId: string, id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const rows = await getDb()
    .delete(vendorRefs)
    .where(and(eq(vendorRefs.id, id), eq(vendorRefs.userId, userId)))
    .returning({ id: vendorRefs.id });
  return rows.length > 0;
}

/** Your own history at a vendor: the trips that point at this ref, newest first. */
export function tripsAtVendor(userId: string, refId: string) {
  return getDb()
    .select({
      id: trips.id,
      mode: trips.mode,
      startDate: trips.startDate,
      status: trips.status,
      costAmount: trips.costAmount,
      costCurrency: trips.costCurrency,
      destinationLabel: trips.destinationLabel,
    })
    .from(trips)
    .where(and(eq(trips.userId, userId), eq(trips.vendorRefId, refId)))
    .orderBy(desc(trips.startDate))
    .limit(100);
}
