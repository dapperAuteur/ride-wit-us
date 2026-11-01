"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NOT_FOUND, databaseFailure, requireMobilityOwner } from "@/lib/mobility/action-kit";
import type { FormState } from "@/lib/mobility/form-state";
import { deleteVendorRef, upsertVendorRef } from "@/lib/mobility/vendor-refs";
import { centosProblemCopy } from "@/lib/centos/messages";
import { getCentosVendor, isCentosId, searchCentosVendors, vendorChoices, vendorLabel, type VendorChoice } from "@/lib/centos/vendors";

/**
 * Vendor actions for the picker and the vendor pages. Vendors are read from CentenarianOS on the
 * server (the signing secret never reaches the browser) and never created here (PRD Q14).
 */

const UNAVAILABLE = "The mobility app isn't available right now.";

/** The message in a failed envelope, or a fallback. */
function errorOf(state: FormState, fallback: string): string {
  return state && !state.ok ? state.error : fallback;
}

export type VendorSearchResult =
  | { ok: true; choices: VendorChoice[]; createVendorUrl: string; more: boolean }
  | { ok: false; title: string; body: string; code: string };

/** Picker search (debounced on the client). An empty query lists the first vendors by name. */
export async function searchVendors(q: string): Promise<VendorSearchResult> {
  const owner = await requireMobilityOwner();
  if (!owner.ok) return { ok: false, title: "Not available", body: errorOf(owner.state, UNAVAILABLE), code: "unavailable" };
  const result = await searchCentosVendors(owner.ctx.user.witusSub, { q: typeof q === "string" ? q : "" });
  if (!result.ok) {
    const copy = centosProblemCopy(result.problem);
    return { ok: false, ...copy, code: result.problem };
  }
  return {
    ok: true,
    choices: vendorChoices(result.data.vendors),
    createVendorUrl: result.data.create_vendor_url,
    more: result.data.next_offset !== null,
  };
}

export type LinkVendorResult = { ok: true; refId: string; label: string } | { ok: false; error: string; code: string };

/**
 * Save a pointer to a CentenarianOS vendor (and location) the user picked. The vendor is read back
 * from CentenarianOS first, so only the user's own vendors and their own locations can be linked.
 */
export async function linkVendor(contactId: string, locationId: string | null): Promise<LinkVendorResult> {
  const owner = await requireMobilityOwner();
  if (!owner.ok) return { ok: false, error: errorOf(owner.state, UNAVAILABLE), code: "unavailable" };
  if (!isCentosId(contactId) || (locationId !== null && !isCentosId(locationId))) {
    return { ok: false, error: "Pick a vendor from the list.", code: "invalid" };
  }
  const found = await getCentosVendor(owner.ctx.user.witusSub, contactId);
  if (!found.ok) return { ok: false, error: centosProblemCopy(found.problem).title, code: found.problem };
  if (locationId && !found.data.vendor.locations.some((l) => l.id === locationId)) {
    return { ok: false, error: "That location isn't one of this vendor's. Pick it from the list.", code: "invalid" };
  }
  try {
    const ref = await upsertVendorRef(owner.ctx.user.id, contactId, locationId);
    return { ok: true, refId: ref.id, label: vendorLabel(found.data.vendor, locationId) };
  } catch (err) {
    return { ok: false, error: errorOf(databaseFailure("link vendor", err), "Couldn't save. Try again in a minute."), code: "database_error" };
  }
}

/** The Vendors page's add flow: link, then open the vendor's page. */
export async function addVendor(contactId: string, locationId: string | null): Promise<LinkVendorResult> {
  const result = await linkVendor(contactId, locationId);
  if (!result.ok) return result;
  revalidatePath("/app/vendors");
  redirect(`/app/vendors/${result.refId}?saved=1`);
}

export async function unlinkVendor(id: string): Promise<FormState> {
  const owner = await requireMobilityOwner();
  if (!owner.ok) return owner.state;
  try {
    const removed = await deleteVendorRef(owner.ctx.user.id, id);
    if (!removed) return NOT_FOUND;
  } catch (err) {
    return databaseFailure("unlink vendor", err);
  }
  revalidatePath("/app", "layout");
  redirect("/app/vendors?removed=1");
}
