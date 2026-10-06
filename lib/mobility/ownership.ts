/**
 * Every foreign id a form submits is checked against the signed-in owner before it is written
 * (the lesson of CentenarianOS's travel authorization fixes: a vehicle or place id from another
 * user's account must never be attachable to your trip, nor yours to theirs). Pure apart from the
 * injected loader, so the rule is tested without a database; ownership-db.ts supplies the real one.
 */
import { isUuid } from "./form-kit";

export type RefKind = "vehicle" | "place" | "journey";

/** Returns the subset of `ids` that belong to the current owner. */
export type OwnedIdLoader = (kind: RefKind, ids: string[]) => Promise<Set<string>>;

export type RefCheck = { ok: true } | { ok: false; kind: RefKind; id: string };

export async function verifyOwnedRefs(
  refs: Partial<Record<RefKind, readonly (string | null | undefined)[]>>,
  loadOwned: OwnedIdLoader
): Promise<RefCheck> {
  for (const kind of Object.keys(refs) as RefKind[]) {
    const ids = [...new Set((refs[kind] ?? []).filter((id): id is string => !!id))];
    if (!ids.length) continue;
    const malformed = ids.find((id) => !isUuid(id));
    if (malformed) return { ok: false, kind, id: malformed };
    const owned = await loadOwned(kind, ids);
    const foreign = ids.find((id) => !owned.has(id));
    if (foreign) return { ok: false, kind, id: foreign };
  }
  return { ok: true };
}

/** Which form field a refused reference belongs to, for the error message. */
export const REF_MESSAGES: Record<RefKind, string> = {
  vehicle: "That vehicle isn't in your garage. Pick one from the list.",
  place: "That place isn't one of your saved places. Pick one from the list.",
  journey: "That trip isn't yours. Open it from your trips list.",
};
