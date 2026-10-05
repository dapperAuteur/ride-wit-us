/**
 * Saved places (PRD §5.8): matching by alias, refusing duplicates, and keeping home private. Pure.
 */
import type { PlaceKind } from "./options";

export interface PlaceLike {
  id: string;
  label: string;
  kind: PlaceKind;
  aliases: readonly string[];
}

/**
 * The comparison key for a place name: case, accents' compatibility forms, punctuation and runs
 * of spaces don't matter. "Blue Note Jazz Club," and "blue  note jazz club" are the same name.
 */
export function normalizePlaceName(name: string): string {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Every key a place answers to: its label and each alias. */
export function placeKeys(place: Pick<PlaceLike, "label" | "aliases">): Set<string> {
  const keys = new Set<string>();
  for (const n of [place.label, ...place.aliases]) {
    const k = normalizePlaceName(n);
    if (k) keys.add(k);
  }
  return keys;
}

/** The saved place a typed name refers to, by label or alias, or null. */
export function matchPlace<P extends PlaceLike>(text: string | null | undefined, places: readonly P[]): P | null {
  const key = text ? normalizePlaceName(text) : "";
  if (!key) return null;
  return places.find((p) => placeKeys(p).has(key)) ?? null;
}

/**
 * Would saving `candidate` make two places answer to the same name? Returns the first clash, or
 * null. `selfId` skips the place being edited.
 */
export function findAliasConflict(
  candidate: Pick<PlaceLike, "label" | "aliases">,
  places: readonly PlaceLike[],
  selfId?: string | null
): { placeId: string; label: string; name: string } | null {
  const mine = placeKeys(candidate);
  for (const p of places) {
    if (p.id === selfId) continue;
    const theirs = placeKeys(p);
    for (const k of mine) {
      if (theirs.has(k)) return { placeId: p.id, label: p.label, name: k };
    }
  }
  return null;
}

/**
 * Split a free-text alias list (one per line or comma-separated), drop blanks, duplicates, and
 * anything equal to the label.
 */
export function parseAliases(raw: string, label: string): string[] {
  const labelKey = normalizePlaceName(label);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\n,]/)) {
    const alias = part.trim().replace(/\s+/g, " ");
    const key = normalizePlaceName(alias);
    if (!key || key === labelKey || seen.has(key)) continue;
    seen.add(key);
    out.push(alias.slice(0, 120));
  }
  return out.slice(0, 20);
}

/**
 * Resolve a trip end: a picked place wins; otherwise a typed name that matches a saved place by
 * label or alias becomes that place; otherwise it stays free text.
 */
export function resolvePlaceRef<P extends PlaceLike>(
  placeId: string | null,
  label: string | null,
  places: readonly P[]
): { placeId: string | null; label: string | null } {
  if (placeId) {
    const picked = places.find((p) => p.id === placeId);
    return { placeId, label: picked?.label ?? label };
  }
  const match = matchPlace(label, places);
  return match ? { placeId: match.id, label: match.label } : { placeId: null, label };
}

/**
 * What of a place may ever leave RideWitUS (events to CentenarianOS, exports, shares). The home
 * place never does (PRD §5.8, §14): every future emitter must pass places through here.
 */
export function shareablePlace(place: PlaceLike | null | undefined): { id: string; label: string } | null {
  if (!place || place.kind === "home") return null;
  return { id: place.id, label: place.label };
}
